import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainConfigService } from './config/blockchain.config';
import { BitcoinService } from './bitcoin.service';

@Module({
  providers: [BlockchainService, BlockchainConfigService, BitcoinService],
  exports: [BlockchainService, BlockchainConfigService],
})
export class BlockchainModule {}
