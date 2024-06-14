import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsString } from 'class-validator';

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
}
