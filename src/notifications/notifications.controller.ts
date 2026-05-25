import {
  Body,
  Controller,
  Head,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MandrillEvent } from './interfaces/webhook.interface';
import { MandrillWebhookGuard } from '../common/guards/mandrill-webhook.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Head('webhook')
  @HttpCode(200)
  webhookReachabilityProbe() {
    return;
  }

  @Post('webhook')
  @UseGuards(MandrillWebhookGuard)
  @HttpCode(200)
  async handleWebhook(@Body('mandrill_events') mandrillEvents: string) {
    let events: MandrillEvent[] = [];
    if (mandrillEvents) {
      try {
        events = JSON.parse(mandrillEvents);
      } catch (err) {
        console.error('Failed to parse mandrill_events payload', err);
        return;
      }
    }
    return this.notificationsService.handleWebhook(events);
  }
}
