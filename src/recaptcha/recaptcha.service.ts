import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateRecaptchaDto } from './dto/create-recaptcha.dto';

@Injectable()
export class RecaptchaService {
  private readonly secretKey: string;
  constructor(configService: ConfigService) {
    this.secretKey = configService.get<string>('RECAPTCHA_SECRET_KEY');
  }

  async verify(
    createRecaptchaDto: CreateRecaptchaDto,
  ): Promise<{ success: boolean }> {
    const { recaptchaToken } = createRecaptchaDto;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${this.secretKey}&response=${recaptchaToken}`;

    const response = await fetch(url, {
      method: 'POST',
    });

    const data = await response.json();
    const isHuman = data.success;
    if (!isHuman) {
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    return { success: true };
  }
}
