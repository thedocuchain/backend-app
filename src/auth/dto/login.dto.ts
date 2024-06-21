import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'bcaf0118-690b-4ada-beb1-3650642dcf33',
  })
  @IsString()
  @IsUUID()
  userId: string;
  @ApiProperty({
    example: 'ea1cd3d5-8eb0-48a9-9794-04c131b1558d',
  })
  @IsString()
  @IsUUID()
  documentId: string;
}
