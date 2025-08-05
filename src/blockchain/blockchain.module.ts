import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainConfigService } from './config/blockchain.config';

@Module({
  providers: [BlockchainService, BlockchainConfigService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
