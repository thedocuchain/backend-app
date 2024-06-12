import { ConfigService } from '@nestjs/config';
import { JWTInput } from 'google-auth-library';

export const getGCStorageConfig = (configService: ConfigService): JWTInput => ({
  type: 'service_account',
  project_id: configService.get('GCS_PROJECT_ID'),
  private_key_id: configService.get('GCS_PRIVATE_KEY_ID'),
  private_key: configService
    .get('GCS_PRIVATE_KEY')
    .split(String.raw`\n`)
    .join('\n'),
  client_email: configService.get('GCS_CLIENT_EMAIL'),
  client_id: configService.get('GCS_CLIENT_ID'),
  universe_domain: 'googleapis.com',
});
