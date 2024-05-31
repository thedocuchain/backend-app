import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({
    example:
      'https://example.com/documents/b5c8ef1f-6629-4be4-a570-6826e110b794',
  })
  @IsString()
  readonly redirectUrl: string;
}
