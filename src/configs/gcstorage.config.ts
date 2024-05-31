import { ConfigService } from '@nestjs/config';
import { JWTInput } from 'google-auth-library';

export const getGCStorageConfig = (configService: ConfigService): JWTInput => ({
  type: 'service_account',
  project_id: configService.get('GCS_PROJECT_ID'),
  private_key_id: configService.get('GCS_PRIVATE_KEY_ID'),
  private_key: configService.get('GCS_PRIVATE_KEY'),
  client_email: configService.get('GCS_CLIENT_EMAIL'),
  client_id: configService.get('GCS_CLIENT_ID'),
  // auth_uri: "https://accounts.google.com/o/oauth2/auth",
  // token_uri: "https://oauth2.googleapis.com/token",
  // auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  // client_x509_cert_url: configService.get('GCS_CLIENT_X509_CERT_URL'),
  universe_domain: 'googleapis.com',
});
