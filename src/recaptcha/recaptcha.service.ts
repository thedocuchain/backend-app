import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaService {
  private readonly secretKey: string;
  constructor(configService: ConfigService) {
    this.secretKey = configService.get<string>('RECAPTCHA_SECRET_KEY');
  }

  async verify(recaptchaToken: string): Promise<{ success: boolean }> {
    try {
      const url = `https://www.google.com/recaptcha/api/siteverify?secret=${this.secretKey}&response=${recaptchaToken}`;
      const response = await fetch(url, {
        method: 'POST',
      });

      const data = await response.json();

      return data.success;
    } catch (error) {
      console.error('Recaptcha verification failed:', error.message);
      throw new InternalServerErrorException('Recaptcha verification failed');
    }
  }
}
