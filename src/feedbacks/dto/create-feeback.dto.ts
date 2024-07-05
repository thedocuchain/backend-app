import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    example: 'John Wick',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    example: 'john.wick@gmail.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Your service is awesome!',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'recaptchaToken',
  })
  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
