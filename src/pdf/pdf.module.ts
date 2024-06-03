import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
