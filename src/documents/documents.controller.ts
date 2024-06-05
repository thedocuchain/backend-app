import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  Param,
  HttpCode,
  UploadedFile,
  Patch,
  Body,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ReadDocumentDto } from './dto/read-document.dto';
import { DownloadDocumentDto } from './dto/download-document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SignDocumentDto } from './dto/sign-document.dto';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: UploadDocumentDto })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Signing document',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        files: 1,
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.documentsService.create(file);
  }

  @Patch(':id')
  @HttpCode(200)
  update(
    @Param('id')
    id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ReadDocumentDto })
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/download')
  @ApiResponse({ status: 200, type: DownloadDocumentDto })
  download(
    @Param('id')
    id: string,
  ) {
    return this.documentsService.download(id);
  }

  @Post(':id/users/:userId/sign')
  // @ApiResponse({ status: 200, type: ReadDocumentDto })
  @HttpCode(200)
  sign(
    @Param('id')
    id: string,
    @Param('userId')
    userId: string,
    @Body() signDocumentDto: SignDocumentDto,
  ) {
    return this.documentsService.sign(id, userId, signDocumentDto);
  }
}
