import { UserRoles } from '../../common/enums/entities.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Wick',
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    example: 'john.wick@gmail.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  read_document: boolean;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  agreed_with_policy: boolean;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  read_records_disclosure: boolean;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  first_to_hear: boolean;

  @ApiProperty({
    example: UserRoles.WATCHER,
  })
  @IsNotEmpty()
  role: UserRoles;

  @ApiProperty({
    example: '91f775524508900f300ffff6872bb5f806398440',
  })
  @IsUUID()
  @IsOptional()
  documentId: string;
}
