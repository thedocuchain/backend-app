import {
  Controller,
  HttpCode,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AccountAuthGuard } from '../common/guards/account-auth.guard';

// Account-scoped upload. Lives under /account so the client sends the account
// token, and the created document is attributed to the account for plan-limit
// enforcement. The public /documents/upload stays anonymous and unmetered.
@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AccountAuthGuard)
@Controller('account/documents')
export class AccountDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: UploadDocumentDto })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.documentsService.uploadForAccount(file, req.user.account);
  }
}
