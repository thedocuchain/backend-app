import { Injectable, Logger } from '@nestjs/common';
import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import { BlockchainConfig } from './interfaces/blockchain-config.interface';

// DigiByte shares Bitcoin's WIF prefix but has its own address versions.
export const DIGIBYTE_NETWORK: bitcoin.Network = {
  messagePrefix: '\x19DigiByte Signed Message:\n',
  bech32: 'dgb',
  bip32: { public: 0x0488b21e, private: 0x0488ade4 },
  pubKeyHash: 0x1e,
  scriptHash: 0x3f,
  wif: 0x80,
};

const SATS_PER_DGB = 100000000;
const DUST_LIMIT = 546;
const MAX_INPUTS = 3;
const MAX_FEE_RATE = 50;

export interface DigiByteInstance {
  keyPair: any;
  publicKey: Buffer;
  address: string;
  currentNodeIndex: number;
  config: BlockchainConfig;
}

@Injectable()
export class DigiByteService {
  private readonly logger = new Logger(DigiByteService.name);
  private instance: DigiByteInstance | null = null;

  async initialize(config: BlockchainConfig): Promise<void> {
    try {
      const keyPair = await this.parseKeyPair(config.privateKey);
      const publicKey = Buffer.from(keyPair.publicKey);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: publicKey,
        network: DIGIBYTE_NETWORK,
      });

      if (!address) {
        throw new Error('Failed to derive DigiByte address');
      }

      this.instance = {
        keyPair,
        publicKey,
        address,
        currentNodeIndex: 0,
        config,
      };

      this.logger.log(`Initialized DigiByte blockchain: ${address}`);
    } catch (error) {
      throw new Error(`Failed to initialize DigiByte: ${error.message}`);
    }
  }

  async deriveAddress(privateKey: string): Promise<string> {
    const keyPair = await this.parseKeyPair(privateKey);
    const { address } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(keyPair.publicKey),
      network: DIGIBYTE_NETWORK,
    });

    if (!address) {
      throw new Error('Failed to derive DigiByte address');
    }

    return address;
  }

  private async parseKeyPair(privateKey: string): Promise<any> {
    const { ECPairFactory } = await import('ecpair');
    const ecc = await import('tiny-secp256k1');
    const ECPair = ECPairFactory(ecc as any);

    try {
      return ECPair.fromWIF(privateKey, DIGIBYTE_NETWORK);
    } catch (wifError) {
      try {
        return ECPair.fromPrivateKey(
          Buffer.from(privateKey.replace(/^0x/, ''), 'hex'),
          { network: DIGIBYTE_NETWORK },
        );
      } catch (hexError) {
        throw new Error(
          `Invalid DigiByte private key format: ${wifError.message}`,
        );
      }
    }
  }

  private get apiUrl(): string {
    return this.instance.config.rpcUrls[this.instance.currentNodeIndex];
  }

  async isNodeAvailable(): Promise<boolean> {
    if (!this.instance) {
      throw new Error('DigiByte service not initialized');
    }

    try {
      const response = await axios.get(`${this.apiUrl}/blocks/tip/height`, {
        timeout: 5000,
      });
      return typeof response.data === 'number' && response.data > 0;
    } catch (error) {
      return false;
    }
  }

  switchNode(): void {
    if (!this.instance) {
      throw new Error('DigiByte service not initialized');
    }

    const { config } = this.instance;
    this.instance.currentNodeIndex =
      (this.instance.currentNodeIndex + 1) % config.rpcUrls.length;

    this.logger.warn(`Switched DigiByte to node: ${this.apiUrl}`);
  }

  async ensureNodeAvailability(): Promise<void> {
    if (await this.isNodeAvailable()) {
      return;
    }

    this.logger.warn(`Node ${this.apiUrl} is down. Switching nodes.`);
    this.switchNode();

    if (!(await this.isNodeAvailable())) {
      throw new Error('All DigiByte nodes are unavailable.');
    }
  }

  async getBalance(apiUrl: string, address: string): Promise<number> {
    const response = await axios.get(`${apiUrl}/address/${address}`, {
      timeout: 10000,
    });
    const stats = response.data?.chain_stats;

    if (!stats) {
      throw new Error('Invalid address response from DigiByte node');
    }

    return (
      (Number(stats.funded_txo_sum) - Number(stats.spent_txo_sum)) /
      SATS_PER_DGB
    );
  }

  private async getFeeRate(): Promise<number> {
    const fallback = this.instance.config.feeRate || 20;

    try {
      const response = await axios.get(`${this.apiUrl}/fee-estimates`, {
        timeout: 5000,
      });
      const economy = Number(response.data?.['144']);

      if (Number.isFinite(economy) && economy >= 1) {
        return Math.min(Math.ceil(economy), MAX_FEE_RATE);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch DigiByte fee rate: ${error.message}`);
    }

    return Math.max(fallback, 1);
  }

  async sendTransaction(hash: string): Promise<string> {
    if (!this.instance) {
      throw new Error('DigiByte service not initialized');
    }

    await this.ensureNodeAvailability();

    try {
      const { keyPair, publicKey, address, config } = this.instance;

      const utxosResponse = await axios.get(
        `${this.apiUrl}/address/${address}/utxo`,
        { timeout: 10000 },
      );
      const utxos = utxosResponse.data;

      if (!Array.isArray(utxos) || utxos.length === 0) {
        throw new Error('No UTXOs available for transaction');
      }

      const transactionValueSats = Math.floor(
        parseFloat(config.transactionValue) * SATS_PER_DGB,
      );
      const feeRate = await this.getFeeRate();
      const psbt = new bitcoin.Psbt({ network: DIGIBYTE_NETWORK });

      utxos.sort((a, b) => b.value - a.value);

      const hashBuffer = Buffer.from(hash.replace(/^0x/, ''), 'hex');
      const embed = bitcoin.payments.embed({ data: [hashBuffer] });

      // OP_RETURN carries the hash, a self-send keeps the wallet's UTXO alive.
      let estimatedSize = 10 + 34 + (11 + hashBuffer.length) + 34;
      let totalInput = 0;
      let inputCount = 0;

      for (const utxo of utxos) {
        // P2PKH inputs are signed against the full previous transaction.
        const rawTx = await axios.get(`${this.apiUrl}/tx/${utxo.txid}/hex`, {
          timeout: 10000,
        });

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(rawTx.data, 'hex'),
        });

        totalInput += utxo.value;
        inputCount++;
        estimatedSize += 148;

        if (
          totalInput >= transactionValueSats + feeRate * estimatedSize ||
          inputCount >= MAX_INPUTS
        ) {
          break;
        }
      }

      const fee = feeRate * estimatedSize;

      if (totalInput < transactionValueSats + fee) {
        throw new Error('Insufficient funds for transaction');
      }

      psbt.addOutput({ script: embed.output, value: 0 });
      psbt.addOutput({ address, value: transactionValueSats });

      const change = totalInput - transactionValueSats - fee;
      if (change > DUST_LIMIT) {
        psbt.addOutput({ address, value: change });
      }

      const signer = {
        publicKey,
        sign: (digest: Buffer) => Buffer.from(keyPair.sign(digest)),
      };

      for (let i = 0; i < inputCount; i++) {
        psbt.signInput(i, signer);
      }

      psbt.finalizeAllInputs();
      const txHex = psbt.extractTransaction().toHex();

      const broadcastResponse = await axios.post(`${this.apiUrl}/tx`, txHex, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000,
      });

      const txId = this.parseTxId(broadcastResponse.data);
      this.logger.log(`DigiByte transaction sent: ${txId}`);

      return txId;
    } catch (error) {
      this.logger.error(
        `Error sending DigiByte transaction: ${error?.response?.data || error.message}`,
        error.stack,
      );
      throw new Error('Failed to send DigiByte transaction');
    }
  }

  private parseTxId(data: unknown): string {
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }
    if (data && typeof data === 'object') {
      const txId = (data as any).txid || (data as any).result;
      if (typeof txId === 'string' && txId) {
        return txId;
      }
    }
    throw new Error('Invalid transaction ID in broadcast response');
  }
}
