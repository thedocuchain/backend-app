import { ConfigService } from '@nestjs/config';

export const getMailgunConfig = (configService: ConfigService) => ({
  username: configService.get('MAILGUN_USERNAME'),
  key: configService.get('MAILGUN_API_KEY'),
  url: configService.get('MAILGUN_URL'),
});
