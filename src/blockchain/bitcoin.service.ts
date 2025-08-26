import { Injectable, Logger } from '@nestjs/common';
import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import { BlockchainConfig } from './interfaces/blockchain-config.interface';

export interface BitcoinInstance {
  keyPair: any;
  network: bitcoin.Network;
  currentNodeIndex: number;
  config: BlockchainConfig;
}

@Injectable()
export class BitcoinService {
  private readonly logger = new Logger(BitcoinService.name);
  private instance: BitcoinInstance | null = null;

  async initialize(config: BlockchainConfig): Promise<void> {
    let network: bitcoin.Network;
    switch (config.network) {
      case 'testnet':
        network = bitcoin.networks.testnet;
        break;
      case 'regtest':
        network = bitcoin.networks.regtest;
        break;
      default:
        network = bitcoin.networks.bitcoin;
    }

    try {
      const { ECPairFactory } = await import('ecpair');
      const ecc = await import('tiny-secp256k1');
      const ECPair = ECPairFactory(ecc as any);

      let keyPair: any;
      try {
        keyPair = ECPair.fromWIF(config.privateKey, network);
      } catch (error) {
        try {
          const privateKeyBuffer = Buffer.from(config.privateKey, 'hex');
          keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network });
        } catch (hexError) {
          throw new Error(
            `Invalid Bitcoin private key format: ${error.message}`,
          );
        }
      }

      this.instance = {
        keyPair,
        network,
        currentNodeIndex: 0,
        config,
      };

      this.logger.log(`Initialized Bitcoin blockchain`);
    } catch (error) {
      throw new Error(`Failed to initialize Bitcoin: ${error.message}`);
    }
  }

  async isNodeAvailable(): Promise<boolean> {
    if (!this.instance) {
      throw new Error('Bitcoin service not initialized');
    }

    this.logger.log(
      `Connected to Bitcoin node: ${this.instance.config.rpcUrls[this.instance.currentNodeIndex]}`,
    );

    try {
      const response = await axios.get(
        `${this.instance.config.rpcUrls[this.instance.currentNodeIndex]}/blocks/tip/height`,
        {
          timeout: 5000,
        },
      );
      if (!response.data || typeof response.data !== 'number') {
        throw new Error('Invalid response from Bitcoin node');
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  switchNode(): void {
    if (!this.instance) {
      throw new Error('Bitcoin service not initialized');
    }

    const { config } = this.instance;
    this.instance.currentNodeIndex =
      (this.instance.currentNodeIndex + 1) % config.rpcUrls.length;

    this.logger.warn(
      `Switched Bitcoin to node: ${config.rpcUrls[this.instance.currentNodeIndex]}`,
    );
  }

  async ensureNodeAvailability(): Promise<void> {
    if (!(await this.isNodeAvailable())) {
      if (!this.instance) {
        throw new Error('Bitcoin service not initialized');
      }

      this.logger.warn(
        `Node ${this.instance.config.rpcUrls[this.instance.currentNodeIndex]} is down. Switching nodes.`,
      );

      this.switchNode();

      if (!(await this.isNodeAvailable())) {
        throw new Error(`All Bitcoin nodes are unavailable.`);
      }
    }
  }

  private async getOptimalFeeRate(
    apiUrl: string,
    fallbackRate: number,
  ): Promise<number> {
    try {
      if (apiUrl.includes('mempool.space')) {
        const response = await axios.get(`${apiUrl}/v1/fees/recommended`, {
          timeout: 5000,
        });
        const fees = response.data;
        return Math.max(fees.economyFee || 1, 1);
      } else if (apiUrl.includes('blockstream.info')) {
        const response = await axios.get(`${apiUrl}/fee-estimates`, {
          timeout: 5000,
        });
        const feeEstimates = response.data;
        return Math.max(Math.ceil(feeEstimates['144'] || 1), 1);
      } else if (apiUrl.includes('blockcypher.com')) {
        const response = await axios.get(`${apiUrl}/`, { timeout: 5000 });
        const data = response.data;
        return Math.max(Math.ceil((data.low_fee_per_kb || 1000) / 1000), 1);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch dynamic fee rate: ${error.message}`);
    }

    return Math.max(fallbackRate, 1);
  }

  async sendTransaction(hash: string): Promise<string> {
    if (!this.instance) {
      throw new Error('Bitcoin service not initialized');
    }

    await this.ensureNodeAvailability();

    try {
      const { keyPair, network, config } = this.instance;

      let publicKey: Buffer;
      if (Buffer.isBuffer(keyPair.publicKey)) {
        publicKey = keyPair.publicKey;
      } else if (keyPair.publicKey instanceof Uint8Array) {
        publicKey = Buffer.from(keyPair.publicKey);
      } else {
        throw new Error(
          `Invalid public key format: ${typeof keyPair.publicKey}`,
        );
      }

      const { address } = bitcoin.payments.p2wpkh({
        pubkey: publicKey,
        network,
      });

      if (!address) {
        throw new Error('Failed to generate Bitcoin address');
      }

      const apiUrl = config.rpcUrls[this.instance.currentNodeIndex];

      let utxos: any[];
      try {
        const utxosResponse = await axios.get(
          `${apiUrl}/address/${address}/utxo`,
        );
        utxos = utxosResponse.data;

        if (!Array.isArray(utxos)) {
          if ((utxos as any).utxos && Array.isArray((utxos as any).utxos)) {
            utxos = (utxos as any).utxos;
          } else {
            throw new Error('Invalid UTXO response format');
          }
        }
      } catch (error) {
        throw new Error(`Failed to fetch UTXOs: ${error.message}`);
      }

      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available for transaction');
      }

      const transactionValueSats = Math.floor(
        parseFloat(config.transactionValue) * 100000000,
      );
      const feeRate = await this.getOptimalFeeRate(apiUrl, config.feeRate || 2);
      const psbt = new bitcoin.Psbt({ network });

      utxos.sort((a, b) => b.value - a.value);

      let totalInput = 0;
      let inputCount = 0;
      const baseSize = 10 + 32 + 8 + 1 + 34 + 34;
      let estimatedSize = baseSize;

      for (const utxo of utxos) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(
              '0014' + bitcoin.crypto.hash160(publicKey).toString('hex'),
              'hex',
            ),
            value: utxo.value,
          },
        });

        totalInput += utxo.value;
        inputCount++;
        estimatedSize += 148;

        const currentFee = feeRate * estimatedSize;
        if (totalInput >= transactionValueSats + currentFee) {
          break;
        }

        if (inputCount >= 3) {
          break;
        }
      }

      const fee = feeRate * estimatedSize;

      if (totalInput < transactionValueSats + fee) {
        throw new Error('Insufficient funds for transaction');
      }

      let hashBuffer: Buffer;
      if (hash.startsWith('0x')) {
        hashBuffer = Buffer.from(hash.slice(2), 'hex');
      } else {
        hashBuffer = Buffer.from(hash, 'hex');
      }

      const embed = bitcoin.payments.embed({ data: [hashBuffer] });
      psbt.addOutput({
        script: embed.output!,
        value: 0,
      });

      psbt.addOutput({
        address,
        value: transactionValueSats,
      });

      const change = totalInput - transactionValueSats - fee;
      if (change > 546) {
        psbt.addOutput({
          address,
          value: change,
        });
      }

      for (let i = 0; i < inputCount; i++) {
        const signerWrapper = {
          publicKey: publicKey,
          sign: (hash: Buffer) => {
            const signature = keyPair.sign(hash);
            return Buffer.isBuffer(signature)
              ? signature
              : Buffer.from(signature);
          },
        };
        psbt.signInput(i, signerWrapper);
      }

      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();

      const broadcastResponse = await axios.post(`${apiUrl}/tx`, txHex, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000,
      });

      let txId = broadcastResponse.data;
      if (typeof txId !== 'string') {
        if ((txId as any).txid) {
          txId = (txId as any).txid;
        } else if ((txId as any).result) {
          txId = (txId as any).result;
        } else {
          throw new Error('Invalid transaction ID in response');
        }
      }

      this.logger.log(`Bitcoin transaction sent: ${txId}`);
      return txId;
    } catch (error) {
      this.logger.error(`Error sending Bitcoin transaction`, error.stack);
      throw new Error(`Failed to send Bitcoin transaction`);
    }
  }
}
