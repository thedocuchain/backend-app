import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Web3, { Web3BaseWalletAccount } from 'web3';
import { ConfigService } from '@nestjs/config';
import { BlockchainTypes } from '../common/enums/entities.enum';
import { BlockchainConfigService } from './config/blockchain.config';
import { BlockchainConfig } from './interfaces/blockchain-config.interface';

interface BlockchainInstance {
  web3: Web3;
  account: Web3BaseWalletAccount;
  currentNodeIndex: number;
  config: BlockchainConfig;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly blockchainInstances: Map<string, BlockchainInstance> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainConfigService: BlockchainConfigService,
  ) {
    this.initializeBlockchains();
  }

  private initializeBlockchains(): void {
    const supportedBlockchains =
      this.blockchainConfigService.getSupportedBlockchains();

    for (const blockchain of supportedBlockchains) {
      try {
        const config = this.blockchainConfigService.getConfig(blockchain);
        this.initializeBlockchain(blockchain, config);
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

  private initializeBlockchain(
    blockchain: string,
    config: BlockchainConfig,
  ): void {
    const web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrls[0]));

    const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
    web3.eth.accounts.wallet.add(account);

    const instance: BlockchainInstance = {
      web3,
      account,
      currentNodeIndex: 0,
      config,
    };

    this.blockchainInstances.set(blockchain, instance);
    this.logger.log(`Initialized ${blockchain} blockchain`);
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
    this.logger.log(
      `Connected to ${blockchain} node: ${instance.config.rpcUrls[instance.currentNodeIndex]}`,
    );

    try {
      await instance.web3.eth.net.isListening();
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

    instance.web3 = new Web3(
      new Web3.providers.HttpProvider(
        config.rpcUrls[instance.currentNodeIndex],
      ),
    );

    instance.account = instance.web3.eth.accounts.privateKeyToAccount(
      config.privateKey,
    );
    instance.web3.eth.accounts.wallet.add(instance.account);

    this.logger.warn(
      `Switched ${blockchain} to node: ${config.rpcUrls[instance.currentNodeIndex]}`,
    );
  }

  private async ensureNodeAvailability(blockchain: string): Promise<void> {
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

    try {
      const instance = this.getBlockchainInstance(blockchain);
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
        `Error sending transaction on ${blockchain}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to send transaction on ${blockchain}`,
      );
    }
  }
}
