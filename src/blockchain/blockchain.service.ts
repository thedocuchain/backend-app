import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Web3 from 'web3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly polygonRpcUrl: string;
  private readonly polygonRpcUrlAnc: string;
  private readonly polygonRpcUrlBor: string;
  private readonly polygonRpcUrls: string[];
  private readonly privateKey: string;
  private account: any;
  private currentNodeIndex: number;
  private web3: Web3;

  constructor(private readonly configService: ConfigService) {
    this.polygonRpcUrl = configService.get<string>('POLYGON_RPC_NODE');
    this.polygonRpcUrlAnc = configService.get<string>('POLYGON_RPC_NODE_ANC');
    this.polygonRpcUrlBor = configService.get<string>('POLYGON_RPC_NODE_BOR');
    this.privateKey = configService.get<string>('MATIC_PRIVATE_KEY');
    this.currentNodeIndex = 0;
    this.polygonRpcUrls = [
      this.polygonRpcUrl,
      this.polygonRpcUrlAnc,
      this.polygonRpcUrlBor,
    ];

    if (!this.privateKey) {
      throw new Error('No Polygon private key provided.');
    }

    this.initializeWeb3();
  }

  private initializeWeb3() {
    this.web3 = new Web3(
      new Web3.providers.HttpProvider(
        this.polygonRpcUrls[this.currentNodeIndex],
      ),
    );
    this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    this.web3.eth.accounts.wallet.add(this.account);
  }

  private async isNodeAvailable(): Promise<boolean> {
    this.logger.log(
      `Connected to Polygon node: ${this.polygonRpcUrls[this.currentNodeIndex]}`,
    );
    try {
      await this.web3.eth.net.isListening();
      return true;
    } catch (error) {
      return false;
    }
  }

  private switchNode() {
    this.currentNodeIndex =
      (this.currentNodeIndex + 1) % this.polygonRpcUrls.length;
    this.initializeWeb3();
    this.logger.warn(
      `Switched to node: ${this.polygonRpcUrls[this.currentNodeIndex]}`,
    );
  }

  private async ensureNodeAvailability() {
    if (!(await this.isNodeAvailable())) {
      this.logger.warn(
        `Node ${this.polygonRpcUrls[this.currentNodeIndex]} is down. Switching nodes.`,
      );
      this.switchNode();
      if (!(await this.isNodeAvailable())) {
        throw new InternalServerErrorException(
          'All Polygon nodes are unavailable.',
        );
      }
    }
  }

  async sendHash(hash: string): Promise<string> {
    await this.ensureNodeAvailability();
    try {
      const from = this.account.address;
      let gasPrice = await this.web3.eth.getGasPrice();
      gasPrice = BigInt(gasPrice);
      const increasedGasPrice = (gasPrice * 140n) / 100n;
      const nonce = await this.web3.eth.getTransactionCount(from);
      const tx = {
        from,
        to: '0x0000000000000000000000000000000000000000',
        value: this.web3.utils.toWei('0.001', 'ether'),
        data: hash,
        gas: 4000000,
        gasPrice: increasedGasPrice,
        nonce,
        chainId: 137,
      };

      const signedTransaction = await this.account.signTransaction(tx);
      const receipt = await this.web3.eth.sendSignedTransaction(
        signedTransaction.rawTransaction as string,
      );
      return receipt.transactionHash.toString();
    } catch (error) {
      this.logger.error('Error sending transaction', error.stack);
      throw new InternalServerErrorException('Failed to send transaction');
    }
  }
}
