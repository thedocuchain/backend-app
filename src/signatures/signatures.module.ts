import { Module } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signature } from '../database/entities/signature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Signature])],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
