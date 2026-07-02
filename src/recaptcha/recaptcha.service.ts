import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secretKey: string;
  constructor(configService: ConfigService) {
    this.secretKey = configService.get<string>('RECAPTCHA_SECRET_KEY');
  }

  async verify(recaptchaToken: string): Promise<boolean> {
    try {
      const url = `https://www.google.com/recaptcha/api/siteverify?secret=${this.secretKey}&response=${recaptchaToken}`;
      const response = await fetch(url, {
        method: 'POST',
      });

      const data = await response.json();

      const isHuman =
        data.score !== undefined
          ? data.success && data.score > 0.5
          : data.success;

      if (!isHuman) {
        this.logger.warn(
          `reCAPTCHA rejected: success=${data.success} score=${data.score} action=${data.action} hostname=${data.hostname} errors=${JSON.stringify(data['error-codes'])} tokenLength=${recaptchaToken?.length}`,
        );
      }

      return isHuman;
    } catch (error) {
      console.error('Recaptcha verification failed:', error.message);
      throw new InternalServerErrorException('Recaptcha verification failed');
    }
  }
}
