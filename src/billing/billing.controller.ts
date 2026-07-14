import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AccountAuthGuard } from '../common/guards/account-auth.guard';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(AccountAuthGuard)
@Controller('account/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  status(@Request() req) {
    return this.billingService.getStatus(req.user.account);
  }

  @Post('checkout')
  @HttpCode(200)
  async checkout(@Request() req, @Body() dto: CreateCheckoutDto) {
    const url = await this.billingService.createCheckoutSession(
      req.user.account,
      dto.plan,
    );
    return { url };
  }

  @Post('portal')
  @HttpCode(200)
  async portal(@Request() req) {
    const url = await this.billingService.createPortalSession(req.user.account);
    return { url };
  }
}
