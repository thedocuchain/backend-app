import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRecaptchaDto {
  @ApiProperty({
    example:
      '03AFcWeA4nJJAe3XtGMAL6Th72_8r5R2q0Ncy5v2cSCyT_HhijhjI1We6vUnwFHnmfmwu1pcf',
  })
  @IsString()
  recaptchaToken: string;
}
