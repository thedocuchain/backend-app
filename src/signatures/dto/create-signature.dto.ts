import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSignatureDto {
  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  signed: boolean;

  @ApiProperty({
    example: 'allison-regular',
  })
  @IsOptional()
  @IsString()
  sign_font?: string;

  @ApiProperty({
    example: '2024-06-01T14:05:04.043Z',
  })
  @IsOptional()
  @IsDate()
  sign_date?: Date;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  notified: boolean;

  @ApiProperty({
    example: '2024-06-01T14:05:04.043Z',
  })
  @IsOptional()
  @IsDate()
  last_notify_date?: Date;

  @ApiProperty({
    example: 420,
  })
  @IsNumber()
  y_coordinate: number;

  @ApiProperty({
    example: 2,
  })
  @IsNumber()
  page_number: number;

  @IsOptional()
  @IsString()
  check_sum?: string;
}
