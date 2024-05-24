import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReadUserDto extends CreateUserDto {
  @ApiProperty({
    example: 'fc027ff1-5e94-4933-9875-78d1b8a9676f',
  })
  @IsUUID()
  id: string;
  @ApiProperty({
    example: [],
  })
  signatures: object[];
}
