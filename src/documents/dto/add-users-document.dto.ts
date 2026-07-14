import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ReadUserDto } from '../../users/dto/read-user.dto';
import { BlockchainTypes } from '../../common/enums/entities.enum';

export class AddUsersDocumentDto {
  @ApiProperty({
    description: 'Document name',
    example: 'Contract',
  })
  @IsString()
  @IsNotEmpty({ message: 'Document name is required' })
  readonly name: string;
  @ApiProperty({
    example: [
      {
        name: 'John Smith',
        email: 'john.smith@gmail.com',
        role: 'watcher',
        position: 1,
      },
      {
        name: 'Bob Rider',
        email: 'bob.rider@gmail.com',
        role: 'signer',
        position: 2,
      },
    ],
  })
  @IsArray()
  @ValidateNested()
  readonly users: ReadUserDto[];

  @ApiProperty({
    enum: BlockchainTypes,
    default: BlockchainTypes.POLYGON,
    required: false,
    description: 'Blockchain network to use for document verification',
  })
  @IsOptional()
  @IsEnum(BlockchainTypes)
  readonly blockchain: string = BlockchainTypes.POLYGON;
}
