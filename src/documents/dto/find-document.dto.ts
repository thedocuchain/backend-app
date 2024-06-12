import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class FindDocumentDto {
  @ApiProperty({
    example: 'abc-rate-wrd',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9-]+$/, { message: 'not valid id' })
  @Length(12, 12, { message: 'not valid id' })
  shortId: string;
}
