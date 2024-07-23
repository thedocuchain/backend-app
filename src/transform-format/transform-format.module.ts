import { Module } from '@nestjs/common';
import { TransformFormatService } from './transform-format.service';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [PdfModule],
  exports: [TransformFormatService],
  providers: [TransformFormatService],
})
export class TransformFormatModule {}
