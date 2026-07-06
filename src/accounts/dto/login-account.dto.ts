import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginAccountDto {
  @ApiProperty({
    description: 'Account email',
    example: 'hugo@stakeshark.io',
  })
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    description: 'Account password',
  })
  @IsString()
  readonly password: string;

  @ApiProperty({
    description: 'reCAPTCHA token',
  })
  @IsString()
  readonly recaptchaToken: string;
}
