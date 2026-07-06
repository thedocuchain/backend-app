import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Account email',
    example: 'hugo@stakeshark.io',
  })
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    description: '6-digit verification code sent by email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  readonly code: string;
}
