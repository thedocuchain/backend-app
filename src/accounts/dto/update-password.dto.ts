import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current account password',
  })
  @IsString()
  readonly currentPassword: string;

  @ApiProperty({
    description: 'New account password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password: string;
}
