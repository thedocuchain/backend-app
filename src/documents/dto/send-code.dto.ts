import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendCodeDto {
  @ApiProperty({
    example: 'recaptchaToken',
  })
  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
