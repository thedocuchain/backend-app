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

  // Email "Report" buttons are plain links, so email security scanners
  // (Safe Links, Proofpoint, Mimecast, …) and link-preview bots auto-fetch
  // them with a GET. To avoid auto-reporting the initiator, GET is
  // non-mutating: it only validates the link and renders a confirmation page.
  // The actual report happens on POST, triggered by a human clicking the
  // button on that page — scanners GET links but never submit forms.
  @Get(':id/report')
  async reportConfirmation(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    try {
      await this.documentsService.verifyReportRequest(id, userId, token);
    } catch {
      res.status(400).type('html').send(this.renderInvalidReportLinkPage());
      return;
    }
    res.type('html').send(this.renderReportConfirmationPage());
  }

  @Post(':id/report')
  async report(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    await this.documentsService.report(id, userId, token);
    const clientUrl = this.configService.get('CLIENT_APP_REDIRECT_URL');
    return res.redirect(302, `${clientUrl}/doc/status/${id}?reported=true`);
  }

  private renderReportConfirmationPage(): string {
    // The form has no `action`, so it POSTs to the current URL — preserving the
    // ?userId=&token= query string that the POST handler reads.
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Report sender — DocuChain</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f5f6f8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #101828; padding: 24px; }
  .card { background: #fff; max-width: 440px; width: 100%; padding: 32px; border-radius: 16px;
    box-shadow: 0 4px 24px rgba(16, 24, 40, 0.08); text-align: center; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 22px; color: #475467; margin: 0 0 24px; }
  button { width: 100%; padding: 12px 24px; border-radius: 8px; border: 1px solid #EB8F8F;
    background: #EB8F8F; color: #101828; font-size: 16px; font-weight: 600; cursor: pointer; }
  button:hover { background: #e57e7e; }
  .cancel { display: inline-block; margin-top: 16px; font-size: 14px; color: #667085; text-decoration: none; }
  .cancel:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main class="card">
    <h1>Report this sender?</h1>
    <p>If you don't recognise this sender or document, report it to the DocuChain team. We'll review it and may block the sender from sending further documents.</p>
    <form method="post">
      <button type="submit">Yes, report this sender</button>
    </form>
    <a class="cancel" href="https://docuchain.io">Cancel</a>
  </main>
</body>
</html>`;
  }

  private renderInvalidReportLinkPage(): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Invalid link — DocuChain</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f5f6f8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #101828; padding: 24px; }
  .card { background: #fff; max-width: 440px; width: 100%; padding: 32px; border-radius: 16px;
    box-shadow: 0 4px 24px rgba(16, 24, 40, 0.08); text-align: center; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 22px; color: #475467; margin: 0 0 24px; }
  a { color: #667085; font-size: 14px; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main class="card">
    <h1>This report link is invalid or has expired</h1>
    <p>The link you followed could not be verified. No action has been taken.</p>
    <a href="https://docuchain.io">Go to DocuChain</a>
  </main>
</body>
</html>`;
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
