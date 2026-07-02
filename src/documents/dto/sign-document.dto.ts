import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SignDocumentDto {
  @ApiProperty({
    description: 'Have user agreed with policy',
    example: true,
  })
  @IsBoolean()
  readonly agreedWithPolicy: boolean;
  @ApiProperty({
    description: 'Have user read records disclosure',
    example: true,
  })
  @IsBoolean()
  readonly readRecordsDisclosure: boolean;
  @ApiProperty({
    description: 'Is this the first time a user has heard about us?',
    example: true,
  })
  @IsBoolean()
  readonly firstToHear: boolean;
  @ApiProperty({
    description: 'Have user signed document',
    example: true,
  })
  @IsBoolean()
  readonly signed: boolean;
  @ApiProperty({
    description: 'Signature font name',
    example: 'indie-flower-regular',
  })
  @IsString()
  readonly signFont: string;
  @ApiProperty({
    description: 'Signature font size',
    example: 20,
  })
  @IsNumber()
  readonly fontSize: number;
  @ApiProperty({
    description: 'Signature date in ISO format',
    example: '2024-06-04T11:05:09.680Z',
  })
  @IsDateString()
  readonly signDate: Date;
  @ApiProperty({
    description:
      'Custom signature image (drawn or uploaded) as a PNG/JPEG data URL. When set, it is rendered instead of the font signature.',
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
}
