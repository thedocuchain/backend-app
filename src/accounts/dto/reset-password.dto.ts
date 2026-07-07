import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: '6-digit reset code sent by email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  readonly code: string;

  @ApiProperty({
    description: 'New account password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password: string;
}
