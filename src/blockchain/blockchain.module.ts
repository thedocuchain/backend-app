import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainConfigService } from './config/blockchain.config';
import { BitcoinService } from './bitcoin.service';
import { DigiByteService } from './digibyte.service';

@Module({
  providers: [
    BlockchainService,
    BlockchainConfigService,
    BitcoinService,
    DigiByteService,
  ],
  exports: [BlockchainService, BlockchainConfigService, DigiByteService],
})
export class BlockchainModule {}
