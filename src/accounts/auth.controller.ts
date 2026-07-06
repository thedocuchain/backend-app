import {
  Body,
  Controller,
  HttpCode,
  Ip,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AccountAuthService } from './account-auth.service';
import { RegisterAccountDto } from './dto/register-account.dto';
import { LoginAccountDto } from './dto/login-account.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { AccountAuthGuard } from '../common/guards/account-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly accountAuthService: AccountAuthService) {}

  @Post('register')
  @HttpCode(200)
  register(@Body() registerAccountDto: RegisterAccountDto) {
    return this.accountAuthService.register(registerAccountDto);
  }

  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Request() req,
    @Ip() ip: string,
  ) {
    return this.accountAuthService.verifyEmail(verifyEmailDto, {
      userAgent: req.headers['user-agent'],
      ip,
    });
  }

  @Post('resend-code')
  @HttpCode(200)
  resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.accountAuthService.resendCode(resendCodeDto.email);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body() loginAccountDto: LoginAccountDto,
    @Request() req,
    @Ip() ip: string,
  ) {
    return this.accountAuthService.login(loginAccountDto, {
      userAgent: req.headers['user-agent'],
      ip,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AccountAuthGuard)
  @Post('logout')
  @HttpCode(200)
  logout(@Request() req) {
    return this.accountAuthService.logout(req.user.sessionId);
  }
}
