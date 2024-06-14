import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SubscribeDocumentDto {
  @ApiProperty({
    example: 'goodemail@example.com',
  })
  @IsEmail()
  email: string;
}
