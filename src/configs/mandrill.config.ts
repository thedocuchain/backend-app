import { ConfigService } from '@nestjs/config';

export const getMandrillConfig = (configService: ConfigService) => ({
  apiKey: configService.get<string>('MANDRILL_API_KEY'),
  webhookKey: configService.get<string>('MANDRILL_WEBHOOK_KEY'),
  webhookUrl: configService.get<string>('MANDRILL_WEBHOOK_URL'),
  fromEmail: configService.get<string>('MAIL_FROM_EMAIL'),
  fromName: configService.get<string>('MAIL_FROM_NAME'),
});
