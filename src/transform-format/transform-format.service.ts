import { BadRequestException, Injectable } from '@nestjs/common';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';

const convert = promisify(libre.convert);
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class TransformFormatService {
  constructor(private readonly pdfService: PdfService) {}
  async transformToPdf(
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> {
    let pdfBuffer: Buffer;
    switch (file.mimetype) {
      case 'application/pdf':
        pdfBuffer = file.buffer;
        break;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.oasis.opendocument.text':
        pdfBuffer = await this.convertOfficeToPdf(file.buffer);
        break;
      case 'image/jpeg':
      case 'image/png':
        pdfBuffer = await this.convertImageToPdf(file);
        break;
      default:
        throw new BadRequestException('Unsupported file format');
    }

    return {
      ...file,
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      originalname: file.originalname.replace(/\.[^/.]+$/, '.pdf'),
    };
  }

  private async convertOfficeToPdf(buffer: Buffer): Promise<Buffer> {
    return convert(buffer, 'pdf', undefined);
  }

  private async convertImageToPdf(file: Express.Multer.File): Promise<Buffer> {
    return this.pdfService.convertImageToPdf(file);
  }
}
