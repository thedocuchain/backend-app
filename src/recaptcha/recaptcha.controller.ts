import { Body, Controller, Post } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRecaptchaDto } from './dto/create-recaptcha.dto';

@ApiTags('recaptcha')
@Controller('recaptcha')
export class RecaptchaController {
  constructor(private readonly recaptchaService: RecaptchaService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Submit form with reCAPTCHA verification' })
  @ApiBody({ type: CreateRecaptchaDto })
  @ApiResponse({
    status: 200,
    description: 'Form submitted successfully',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 400, description: 'reCAPTCHA verification failed' })
  async verify(@Body() createRecaptchaDto: CreateRecaptchaDto) {
    return this.recaptchaService.verify(createRecaptchaDto);
  }
}
