import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SupportTicketDto {
  @ApiProperty({
    description: 'Short subject of the support request',
    example: 'Problem with signing a document',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly title: string;

  @ApiProperty({
    description: 'Detailed description of the problem',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  readonly text: string;
}
