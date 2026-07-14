import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterAccountDto {
  @ApiProperty({
    description: 'Full name of the account owner',
    example: 'Hugo Plat',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({
    description: 'Account email',
    example: 'hugo@stakeshark.io',
  })
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'correct horse battery staple',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password: string;
}
