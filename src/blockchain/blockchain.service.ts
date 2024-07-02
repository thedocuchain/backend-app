import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Web3 from 'web3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainService {
  private readonly web3: Web3;
  private readonly account: any;
  private readonly logger = new Logger(BlockchainService.name);
  private readonly polygonRpcUrl: string;
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    this.polygonRpcUrl = configService.get<string>('POLYGON_RPC_NODE');
    this.privateKey = configService.get<string>('MATIC_PRIVATE_KEY');
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.polygonRpcUrl));
    this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    this.web3.eth.accounts.wallet.add(this.account);
  }

  async sendHash(hash: string): Promise<string> {
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
        data: this.web3.utils.asciiToHex(hash),
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
