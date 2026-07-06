import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AccountsService } from './accounts.service';
import { AccountAuthService } from './account-auth.service';
import { toPublicAccount } from './account.mapper';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SaveSignatureDto } from './dto/save-signature.dto';
import { AccountAuthGuard } from '../common/guards/account-auth.guard';

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AccountAuthGuard)
@Controller('account')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly accountAuthService: AccountAuthService,
  ) {}

  @Get()
  me(@Request() req) {
    return toPublicAccount(req.user.account);
  }

  @Patch()
  update(@Request() req, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountsService.updateProfile(
      req.user.account,
      updateAccountDto,
    );
  }

  @Patch('password')
  @HttpCode(200)
  async updatePassword(
    @Request() req,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    await this.accountsService.updatePassword(
      req.user.account,
      updatePasswordDto,
    );
    await this.accountAuthService.revokeOtherSessions(
      req.user.account.id,
      req.user.sessionId,
    );
  }

  @Put('signature')
  saveSignature(@Request() req, @Body() saveSignatureDto: SaveSignatureDto) {
    return this.accountsService.saveSignature(
      req.user.account,
      saveSignatureDto,
    );
  }

  @Get('sessions')
  sessions(@Request() req) {
    return this.accountAuthService.listSessions(
      req.user.account.id,
      req.user.sessionId,
    );
  }

  @Delete('sessions/:id')
  revokeSession(@Request() req, @Param('id') id: string) {
    return this.accountAuthService.revokeSession(req.user.account.id, id);
  }

  @Get('documents')
  documents(@Request() req) {
    return this.accountsService.listDocuments(req.user.account);
  }

  @Get('documents/:id/sign-link')
  getSignLink(@Request() req, @Param('id') id: string) {
    return this.accountsService.getSignLink(req.user.account, id);
  }

  @Post('documents/:id/seen')
  @HttpCode(200)
  markDocumentSeen(@Request() req, @Param('id') id: string) {
    return this.accountsService.markDocumentSeen(req.user.account, id);
  }

  @Post('documents/:id/report')
  @HttpCode(200)
  reportDocument(@Request() req, @Param('id') id: string) {
    return this.accountsService.reportDocument(req.user.account, id);
  }
}
