import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendCodeDto {
  @ApiProperty({
    description: 'Account email',
    example: 'hugo@stakeshark.io',
  })
  @IsEmail()
  readonly email: string;
}
