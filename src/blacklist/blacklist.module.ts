import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlacklistService } from './blacklist.service';
import { BlacklistedEmail } from '../database/entities/blacklisted-email.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlacklistedEmail])],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
