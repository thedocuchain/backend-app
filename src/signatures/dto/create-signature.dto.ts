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
  signFont?: string;

  @ApiProperty({
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @ApiProperty({
    example: '2024-06-01T14:05:04.043Z',
  })
  @IsOptional()
  @IsDate()
  signDate?: Date;

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
  lastNotifyDate?: Date;

  @ApiProperty({
    example: 420,
  })
  @IsNumber()
  yCoordinate: number;

  @ApiProperty({
    example: 2,
  })
  @IsNumber()
  pageNumber: number;

  @IsOptional()
  @IsString()
  checkSum?: string;
}
