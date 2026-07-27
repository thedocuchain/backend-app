import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import Web3, { Web3BaseWalletAccount } from 'web3';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { BlockchainTypes } from '../common/enums/entities.enum';
import { BlockchainConfigService } from './config/blockchain.config';
import { BlockchainConfig } from './interfaces/blockchain-config.interface';
import { BitcoinService } from './bitcoin.service';
import { DigiByteService } from './digibyte.service';

interface EvmBlockchainInstance {
  web3: Web3;
  account: Web3BaseWalletAccount;
  currentNodeIndex: number;
  config: BlockchainConfig;
}

interface SolanaBlockchainInstance {
  connection: Connection;
  keypair: Keypair;
  currentNodeIndex: number;
  config: BlockchainConfig;
}

type BlockchainInstance = EvmBlockchainInstance | SolanaBlockchainInstance;

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly blockchainInstances: Map<string, BlockchainInstance> =
    new Map();
  private readonly bitcoinService = new BitcoinService();

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainConfigService: BlockchainConfigService,
    private readonly digiByteService: DigiByteService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeBlockchains();
  }

  private async initializeBlockchains(): Promise<void> {
    const supportedBlockchains =
      this.blockchainConfigService.getSupportedBlockchains();

    for (const blockchain of supportedBlockchains) {
      try {
        const config = this.blockchainConfigService.getConfig(blockchain);
        await this.initializeBlockchain(blockchain, config);
      } catch (error) {
        this.logger.warn(
          `Failed to initialize ${blockchain}: ${error.message}`,
        );
      }
    }

    if (this.blockchainInstances.size === 0) {
      throw new Error('No blockchain networks could be initialized');
    }
  }

  private async initializeBlockchain(
    blockchain: string,
    config: BlockchainConfig,
  ): Promise<void> {
    if (blockchain === BlockchainTypes.SOLANA) {
      await this.initializeSolanaBlockchain(blockchain, config);
    } else if (blockchain === BlockchainTypes.BITCOIN) {
      await this.bitcoinService.initialize(config);
    } else if (blockchain === BlockchainTypes.DIGIBYTE) {
      await this.digiByteService.initialize(config);
    } else {
      this.initializeEvmBlockchain(blockchain, config);
    }
  }

  private initializeEvmBlockchain(
    blockchain: string,
    config: BlockchainConfig,
  ): void {
    const web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrls[0]));

    const privateKey = config.privateKey.startsWith('0x')
      ? config.privateKey
      : `0x${config.privateKey}`;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);

    const instance: EvmBlockchainInstance = {
      web3,
      account,
      currentNodeIndex: 0,
      config,
    };

    this.blockchainInstances.set(blockchain, instance);
    this.logger.log(`Initialized ${blockchain} blockchain`);
  }

  private async initializeSolanaBlockchain(
    blockchain: string,
    config: BlockchainConfig,
  ): Promise<void> {
    const rpcUrl = config.rpcUrls[0] || clusterApiUrl(config.cluster as any);
    const connection = new Connection(rpcUrl, 'confirmed');

    let keypair: Keypair;
    try {
      keypair = await this.parseSolanaKeypair(config.privateKey);
    } catch (error) {
      throw new Error(`Invalid Solana private key format: ${error.message}`);
    }

    const instance: SolanaBlockchainInstance = {
      connection,
      keypair,
      currentNodeIndex: 0,
      config,
    };

    this.blockchainInstances.set(blockchain, instance);
    this.logger.log(`Initialized ${blockchain} blockchain`);
  }

  private async parseSolanaKeypair(key: string): Promise<Keypair> {
    let bytes: Uint8Array;
    if (key.includes(',')) {
      bytes = Uint8Array.from(
        key.split(',').map((s) => parseInt(s.trim(), 10)),
      );
    } else {
      const hex = key.replace(/^0x/, '');
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
      } else {
        const bs58 = (await import('bs58')).default;
        try {
          bytes = bs58.decode(key);
        } catch {
          bytes = Uint8Array.from(Buffer.from(key, 'base64'));
        }
      }
    }
    return bytes.length === 64
      ? Keypair.fromSecretKey(bytes)
      : Keypair.fromSeed(bytes);
  }

  private getBlockchainInstance(blockchain: string): BlockchainInstance {
    const instance = this.blockchainInstances.get(blockchain);
    if (!instance) {
      throw new Error(`Blockchain ${blockchain} is not initialized`);
    }
    return instance;
  }

  private async isNodeAvailable(blockchain: string): Promise<boolean> {
    const instance = this.getBlockchainInstance(blockchain);

    try {
      if (blockchain === BlockchainTypes.SOLANA) {
        const solanaInstance = instance as SolanaBlockchainInstance;
        await solanaInstance.connection.getVersion();
      } else {
        const evmInstance = instance as EvmBlockchainInstance;
        await evmInstance.web3.eth.getChainId();
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private switchNode(blockchain: string): void {
    const instance = this.getBlockchainInstance(blockchain);
    const { config } = instance;

    instance.currentNodeIndex =
      (instance.currentNodeIndex + 1) % config.rpcUrls.length;

    if (blockchain === BlockchainTypes.SOLANA) {
      const solanaInstance = instance as SolanaBlockchainInstance;
      const rpcUrl =
        config.rpcUrls[instance.currentNodeIndex] ||
        clusterApiUrl(config.cluster as any);
      solanaInstance.connection = new Connection(rpcUrl, 'confirmed');
    } else if (blockchain !== BlockchainTypes.BITCOIN) {
      const evmInstance = instance as EvmBlockchainInstance;
      evmInstance.web3 = new Web3(
        new Web3.providers.HttpProvider(
          config.rpcUrls[instance.currentNodeIndex],
        ),
      );

      evmInstance.account = evmInstance.web3.eth.accounts.privateKeyToAccount(
        config.privateKey,
      );
      evmInstance.web3.eth.accounts.wallet.add(evmInstance.account);
    }

    this.logger.warn(
      `Switched ${blockchain} to node: ${config.rpcUrls[instance.currentNodeIndex]}`,
    );
  }

  private async ensureNodeAvailability(blockchain: string): Promise<void> {
    if (blockchain === BlockchainTypes.BITCOIN) {
      await this.bitcoinService.ensureNodeAvailability();
      return;
    }

    if (blockchain === BlockchainTypes.DIGIBYTE) {
      await this.digiByteService.ensureNodeAvailability();
      return;
    }

    if (!(await this.isNodeAvailable(blockchain))) {
      const instance = this.getBlockchainInstance(blockchain);
      this.logger.warn(
        `Node ${instance.config.rpcUrls[instance.currentNodeIndex]} is down. Switching nodes.`,
      );

      this.switchNode(blockchain);

      if (!(await this.isNodeAvailable(blockchain))) {
        throw new InternalServerErrorException(
          `All ${blockchain} nodes are unavailable.`,
        );
      }
    }
  }

  async sendHash(
    hash: string,
    blockchain: string = BlockchainTypes.POLYGON,
  ): Promise<string> {
    await this.ensureNodeAvailability(blockchain);

    if (blockchain === BlockchainTypes.SOLANA) {
      return this.sendSolanaTransaction(hash, blockchain);
    } else if (blockchain === BlockchainTypes.BITCOIN) {
      return this.bitcoinService.sendTransaction(hash);
    } else if (blockchain === BlockchainTypes.DIGIBYTE) {
      return this.digiByteService.sendTransaction(hash);
    } else {
      return this.sendEvmTransaction(hash, blockchain);
    }
  }

  private async sendEvmTransaction(
    hash: string,
    blockchain: string,
  ): Promise<string> {
    try {
      const instance = this.getBlockchainInstance(
        blockchain,
      ) as EvmBlockchainInstance;
      const { web3, account, config } = instance;

      const from = account.address;
      let gasPrice = await web3.eth.getGasPrice();
      gasPrice = BigInt(gasPrice);
      const increasedGasPrice =
        (gasPrice * BigInt(config.gasPriceMultiplier)) / 100n;
      const nonce = await web3.eth.getTransactionCount(from);

      const tx = {
        from,
        to: '0x0000000000000000000000000000000000000000',
        value: web3.utils.toWei(config.transactionValue, 'ether'),
        data: hash,
        gas: config.gasLimit,
        gasPrice: increasedGasPrice,
        nonce,
        chainId: config.chainId,
      };

      const signedTransaction = await account.signTransaction(tx);
      const receipt = await web3.eth.sendSignedTransaction(
        signedTransaction.rawTransaction as string,
      );

      this.logger.log(
        `Transaction sent on ${blockchain}: ${receipt.transactionHash}`,
      );
      return receipt.transactionHash.toString();
    } catch (error) {
      this.logger.error(
        `Error sending EVM transaction on ${blockchain}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to send transaction on ${blockchain}`,
      );
    }
  }

  private async sendSolanaTransaction(
    hash: string,
    blockchain: string,
  ): Promise<string> {
    try {
      const instance = this.getBlockchainInstance(
        blockchain,
      ) as SolanaBlockchainInstance;
      const { connection, keypair, config } = instance;

      const lamports = parseFloat(config.transactionValue) * 1000000000;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey,
          lamports: Math.floor(lamports),
        }),
      );

      transaction.add({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(hash, 'utf8'),
      });

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' },
      );

      this.logger.log(`Transaction sent on ${blockchain}: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(
        `Error sending Solana transaction on ${blockchain}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to send transaction on ${blockchain}`,
      );
    }
  }
}
