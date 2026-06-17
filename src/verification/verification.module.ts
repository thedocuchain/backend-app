import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VerificationService } from './verification.service';
import { VerificationCode } from '../database/entities/verification-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationCode])],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
