import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SaveSignatureDto {
  @ApiProperty({
    description:
      'Signature image (drawn or uploaded) as a PNG/JPEG data URL. Clears the font signature.',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2 * 1024 * 1024, {
    message: 'signImage is too large',
  })
  @Matches(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/, {
    message: 'signImage must be a PNG or JPEG base64 data URL',
  })
  readonly signImage?: string;

  @ApiProperty({
    description:
      'Signature font name (generated signature). Clears the image signature.',
    example: 'indie-flower-regular',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly signFont?: string;
}
