import { UserRoles } from '../../common/enums/entities.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  Contains,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Signature } from '../../database/entities/signature.entity';

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
    example: 'john.wick@gmail.com',
  })
  @IsNumber()
  @IsNotEmpty()
  position: number;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  agreedWithPolicy: boolean;

  @ApiProperty({
    example: 'sent',
  })
  @IsString()
  notifyStatus: string;

  @ApiProperty({
    example: '2021-01-20T12:00:00.000Z',
  })
  @IsString()
  lastNotifyDate: Date;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  readRecordsDisclosure: boolean;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  firstToHear: boolean;

  @ApiProperty({
    example: UserRoles.WATCHER,
  })
  @IsNotEmpty()
  @IsString()
  @Contains(UserRoles.SIGNER || UserRoles.WATCHER)
  role: UserRoles;

  @ApiProperty({
    example: '91f775524508900f300ffff6872bb5f806398440',
  })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @IsOptional()
  @IsArray()
  signatures: Signature[];
}
