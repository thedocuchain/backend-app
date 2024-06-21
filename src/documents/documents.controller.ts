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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { DocumentsService } from './documents.service';

import { DownloadDocumentDto } from './dto/download-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ReadDocumentDto } from './dto/read-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { FindDocumentDto } from './dto/find-document.dto';
import { SubscribeDocumentDto } from './dto/subscribe-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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

  @Post('status')
  @ApiResponse({ status: 200, type: UploadDocumentDto })
  checkStatus(
    @Body() findDocumentDto: FindDocumentDto,
  ): Promise<UploadDocumentDto> {
    return this.documentsService.checkStatus(findDocumentDto);
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

  @Post(':id/subscribe')
  @HttpCode(200)
  subscribe(
    @Param('id')
    id: string,
    @Body() subscribeDocumentDto: SubscribeDocumentDto,
  ) {
    return this.documentsService.subscribe(id, subscribeDocumentDto);
  }

  @Post(':id/notify')
  @HttpCode(200)
  notifyUsers(
    @Param('id')
    id: string,
  ) {
    return this.documentsService.notify(id);
  }

  @Post(':id/users/:userId/notify')
  @HttpCode(200)
  notifyUser(
    @Param('id')
    id: string,
    @Param('userId')
    userId: string,
  ) {
    return this.documentsService.notify(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/users/:userId/sign')
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
