import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MailgunEvent } from './interfaces/webhook.interface';
import { MailgunWebhookGuard } from '../common/guards/mailgun-webhook.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('webhook/delivered')
  @UseGuards(MailgunWebhookGuard)
  @HttpCode(200)
  async webhook(@Body() webhookData: MailgunEvent) {
    return this.notificationsService.handleWebhook(webhookData);
  }
}
