import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DownloadDocumentDto {
  @ApiProperty({
    example: 'https://example.com/b5c8ef1f-6629-4be4-a570-6826e110b794',
  })
  @IsString()
  fileLink: string;
}
