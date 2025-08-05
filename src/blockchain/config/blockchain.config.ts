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
      [BlockchainTypes.BSC]: {
        rpcUrls: [
          this.configService.get<string>('BSC_RPC_NODE'),
          this.configService.get<string>('BSC_RPC_NODE_ANC'),
          this.configService.get<string>('BSC_RPC_NODE_DEFI'),
        ].filter(Boolean),
        privateKey: this.configService.get<string>('BSC_PRIVATE_KEY'),
        chainId: 56,
        transactionValue: '0.0000001',
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

    if (!config.rpcUrls.length) {
      throw new Error(`No RPC URLs configured for blockchain: ${blockchain}`);
    }

    return config;
  }

  getSupportedBlockchains(): string[] {
    return Object.keys(this.configs);
  }
}
