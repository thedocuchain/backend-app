import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { WalletMonitorService } from './wallet-monitor.service';

@Module({
  imports: [BlockchainModule],
  providers: [WalletMonitorService],
})
export class WalletMonitorModule {}
