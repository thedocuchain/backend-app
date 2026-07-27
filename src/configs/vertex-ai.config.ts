import { ConfigService } from '@nestjs/config';
import { JWTInput } from 'google-auth-library';

export interface VertexAiConfig {
  projectId: string;
  location: string;
  model: string;
  credentials: JWTInput;
}

export const getVertexAiConfig = (
  configService: ConfigService,
): VertexAiConfig => ({
  projectId: configService.get<string>('VERTEX_AI_PROJECT_ID') || '',
  location: configService.get<string>('VERTEX_AI_LOCATION') || 'global',
  model: configService.get<string>('VERTEX_AI_MODEL') || 'gemini-2.5-flash',
  credentials: {
    type: 'service_account',
    project_id: configService.get<string>('VERTEX_AI_PROJECT_ID'),
    private_key_id: configService.get<string>('VERTEX_AI_PRIVATE_KEY_ID'),
    private_key: (configService.get<string>('VERTEX_AI_PRIVATE_KEY') || '')
      .split(String.raw`\n`)
      .join('\n'),
    client_email: configService.get<string>('VERTEX_AI_CLIENT_EMAIL'),
    client_id: configService.get<string>('VERTEX_AI_CLIENT_ID'),
    universe_domain: 'googleapis.com',
  },
});

// The global endpoint has no region prefix; regional ones do.
export const vertexApiHost = (location: string): string =>
  location === 'global'
    ? 'https://aiplatform.googleapis.com'
    : `https://${location}-aiplatform.googleapis.com`;

// Dormant until credentials are configured, so shipping without keys is safe.
export const isAiReviewEnabled = (config: VertexAiConfig): boolean =>
  Boolean(
    config.projectId &&
      config.credentials.private_key &&
      config.credentials.client_email,
  );
