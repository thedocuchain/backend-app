import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import { Readable } from 'node:stream';

import {
  getVertexAiConfig,
  isAiReviewEnabled,
  vertexApiHost,
  VertexAiConfig,
} from '../configs/vertex-ai.config';

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

// Base64 inflates by 4/3 against a 20MB request ceiling.
export const MAX_INLINE_FILE_SIZE = 14 * 1024 * 1024;

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

@Injectable()
export class VertexAiService {
  private readonly logger = new Logger(VertexAiService.name);
  private readonly config: VertexAiConfig;
  private auth: GoogleAuth | null = null;

  constructor(configService: ConfigService) {
    this.config = getVertexAiConfig(configService);
  }

  get enabled(): boolean {
    return isAiReviewEnabled(this.config);
  }

  private async accessToken(): Promise<string> {
    if (!this.auth) {
      this.auth = new GoogleAuth({
        credentials: this.config.credentials,
        scopes: SCOPES,
      });
    }
    const client = await this.auth.getClient();
    const { token } = await client.getAccessToken();
    return token;
  }

  private endpoint(): string {
    const { projectId, location, model } = this.config;
    return (
      `${vertexApiHost(location)}/v1/projects/${projectId}/locations/${location}` +
      `/publishers/google/models/${model}:streamGenerateContent?alt=sse`
    );
  }

  async streamGenerate(
    parts: GeminiPart[],
    systemInstruction: string,
    onChunk: (text: string) => Promise<void> | void,
  ): Promise<void> {
    const token = await this.accessToken();

    const response = await axios.post(
      this.endpoint(),
      {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 180000,
      },
    );

    await this.consumeSse(response.data as Readable, onChunk);
  }

  private async consumeSse(
    stream: Readable,
    onChunk: (text: string) => Promise<void> | void,
  ): Promise<void> {
    let buffer = '';

    for await (const piece of stream) {
      buffer += piece.toString('utf8');

      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        boundary = buffer.indexOf('\n');

        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        const text = this.extractText(payload);
        if (text) await onChunk(text);
      }
    }
  }

  private extractText(payload: string): string {
    try {
      const parsed = JSON.parse(payload);
      const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
      return parts.map((part) => part.text ?? '').join('');
    } catch (error) {
      this.logger.warn(`Unparsable Vertex chunk: ${payload.slice(0, 200)}`);
      return '';
    }
  }
}
