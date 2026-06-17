import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  Param,
  Query,
  HttpCode,
  UploadedFile,
  Patch,
  Body,
  UseGuards,
  Request,
  Res,
  Ip,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
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
import { AddUsersDocumentDto } from './dto/add-users-document.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { FindDocumentDto } from './dto/find-document.dto';
import { SubscribeDocumentDto } from './dto/subscribe-document.dto';
import { NotifyDocumentDto } from './dto/notify-document.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { ConfirmCodeDto } from './dto/confirm-code.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly configService: ConfigService,
  ) {}

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
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.documentsService.upload(file);
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
    @Body() updateDocumentDto: AddUsersDocumentDto,
  ) {
    return this.documentsService.addUsersToDocument(id, updateDocumentDto);
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

  @Post(':id/verify-initiator/send')
  @HttpCode(200)
  sendInitiatorCode(
    @Param('id')
    id: string,
    @Body() sendCodeDto: SendCodeDto,
  ) {
    return this.documentsService.sendInitiatorCode(
      id,
      sendCodeDto.recaptchaToken,
    );
  }

  @Post(':id/verify-initiator/confirm')
  @HttpCode(200)
  confirmInitiator(
    @Param('id')
    id: string,
    @Body() confirmCodeDto: ConfirmCodeDto,
  ) {
    return this.documentsService.confirmInitiator(id, confirmCodeDto.code);
  }

  @Get(':id/report')
  async report(
    @Param('id')
    id: string,
    @Query('userId') userId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    await this.documentsService.report(id, userId, token);
    const clientUrl = this.configService.get('CLIENT_APP_REDIRECT_URL');
    return res.redirect(302, `${clientUrl}/doc/status/${id}?reported=true`);
  }

  @Post(':id/notify')
  @HttpCode(200)
  notifyUsers(
    @Param('id')
    id: string,
    @Body() notifyDocumentDto: NotifyDocumentDto,
  ) {
    return this.documentsService.notify(id, notifyDocumentDto.recaptchaToken);
  }

  @Post(':id/users/:userId/notify')
  @HttpCode(200)
  notifyUser(
    @Param('id')
    id: string,
    @Param('userId')
    userId: string,
    @Body() notifyDocumentDto: NotifyDocumentDto,
  ) {
    return this.documentsService.notify(
      id,
      notifyDocumentDto.recaptchaToken,
      userId,
    );
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
    @Request() req,
    @Ip() ip: string,
  ) {
    return this.documentsService.sign(id, userId, signDocumentDto, req, ip);
  }
}
