import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateAccountDto {
  @ApiProperty({
    description: 'Full name of the account owner',
    example: 'Hugo Plat',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name?: string;

  @ApiProperty({
    description: 'Avatar as a PNG/JPEG base64 data URL',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500 * 1024, {
    message: 'avatarImage is too large',
  })
  @Matches(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/, {
    message: 'avatarImage must be a PNG or JPEG base64 data URL',
  })
  readonly avatarImage?: string;
}
