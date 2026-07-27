import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainTypes } from '../../common/enums/entities.enum';
import {
  BlockchainConfig,
  BlockchainConfigs,
} from '../interfaces/blockchain-config.interface';

@Injectable()
export class BlockchainConfigService {
  private readonly configs: BlockchainConfigs;

  constructor(private readonly configService: ConfigService) {
    this.configs = this.initializeConfigs();
  }

  private initializeConfigs(): BlockchainConfigs {
    return {
      [BlockchainTypes.POLYGON]: {
        rpcUrls: [
          this.configService.get<string>('POLYGON_RPC_NODE'),
          this.configService.get<string>('POLYGON_RPC_NODE_ANC'),
          this.configService.get<string>('POLYGON_RPC_NODE_BOR'),
        ].filter(Boolean),
        privateKey: this.configService.get<string>('MATIC_PRIVATE_KEY'),
        chainId: 137,
        transactionValue: '0.001',
        gasLimit: 4000000,
        gasPriceMultiplier: 140,
      },
      [BlockchainTypes.DIGIBYTE]: {
        rpcUrls: [
          this.configService.get<string>('DIGIBYTE_RPC_NODE') ||
            'https://digiexplorer.info/api',
          this.configService.get<string>('DIGIBYTE_RPC_NODE_2'),
        ].filter(Boolean),
        privateKey: this.configService.get<string>('DIGIBYTE_PRIVATE_KEY'),
        transactionValue: '0.001',
        network: 'mainnet',
        feeRate: parseInt(
          this.configService.get<string>('DIGIBYTE_FEE_RATE') || '20',
        ),
      },
      [BlockchainTypes.SOLANA]: {
        rpcUrls: [
          this.configService.get<string>('SOLANA_RPC_NODE'),
          this.configService.get<string>('SOLANA_RPC_NODE_ANC'),
        ].filter(Boolean),
        privateKey: this.configService.get<string>('SOLANA_PRIVATE_KEY'),
        transactionValue: '0.000005',
        cluster:
          this.configService.get<string>('SOLANA_CLUSTER') || 'mainnet-beta',
      },
      [BlockchainTypes.MONAD]: {
        rpcUrls: [
          this.configService.get<string>('MONAD_RPC_NODE') ||
            'https://testnet-rpc.monad.xyz/',
          this.configService.get<string>('MONAD_RPC_NODE_ANC'),
        ].filter(Boolean),
        privateKey: this.configService.get<string>('MONAD_PRIVATE_KEY'),
        chainId: 10143,
        transactionValue: '0.0001',
        gasLimit: 4000000,
        gasPriceMultiplier: 140,
      },
      [BlockchainTypes.BASE]: {
        rpcUrls: [
          this.configService.get<string>('BASE_RPC_NODE') ||
            'https://mainnet.base.org',
          this.configService.get<string>('BASE_RPC_NODE_ANC') ||
            'https://1rpc.io/base',
          this.configService.get<string>('BASE_RPC_NODE_DRPC') ||
            'https://base.drpc.org',
        ].filter(Boolean),
        privateKey: this.configService.get<string>('BASE_PRIVATE_KEY'),
        chainId: 8453,
        transactionValue: '0.00001',
        gasLimit: 4000000,
        gasPriceMultiplier: 140,
      },
      [BlockchainTypes.BITCOIN]: {
        rpcUrls: [
          this.configService.get<string>('BITCOIN_RPC_NODE') ||
            'https://blockstream.info/api',
          this.configService.get<string>('BITCOIN_RPC_NODE_2') ||
            'https://api.blockcypher.com/v1/btc/main',
          this.configService.get<string>('BITCOIN_RPC_NODE_MEMPOOL') ||
            'https://mempool.space/api',
        ].filter(Boolean),
        privateKey: this.configService.get<string>('BITCOIN_PRIVATE_KEY'),
        transactionValue: '0.00001',
        network: (this.configService.get<string>('BITCOIN_NETWORK') ||
          'mainnet') as 'mainnet' | 'testnet' | 'regtest',
        feeRate: parseInt(
          this.configService.get<string>('BITCOIN_FEE_RATE') || '2',
        ),
      },
      [BlockchainTypes.SEI]: {
        rpcUrls: [
          this.configService.get<string>('SEI_RPC_NODE') ||
            'https://evm-rpc.sei-apis.com',
          this.configService.get<string>('SEI_RPC_NODE_2') ||
            'https://sei-evm-rpc.publicnode.com',
          this.configService.get<string>('SEI_RPC_NODE_3') ||
            'https://sei-evm.drpc.org',
        ].filter(Boolean),
        privateKey: this.configService.get<string>('SEI_PRIVATE_KEY'),
        chainId: 1329,
        transactionValue: '0.0001',
        gasLimit: 4000000,
        gasPriceMultiplier: 140,
      },
    };
  }

  getConfig(blockchain: string): BlockchainConfig {
    const config = this.configs[blockchain];
    if (!config) {
      throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    if (!config.privateKey) {
      throw new Error(
        `No private key configured for blockchain: ${blockchain}`,
      );
    }

    if (blockchain === BlockchainTypes.SOLANA) {
      if (!config.rpcUrls.length && !config.cluster) {
        throw new Error(`No RPC URLs or cluster configured for Solana`);
      }
    } else {
      if (!config.rpcUrls.length) {
        throw new Error(`No RPC URLs configured for blockchain: ${blockchain}`);
      }
    }

    return config;
  }

  getSupportedBlockchains(): string[] {
    return Object.keys(this.configs);
  }
}
