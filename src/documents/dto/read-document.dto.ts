import {
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  BlockchainTypes,
  DocumentStatuses,
} from '../../common/enums/entities.enum';
import { User } from '../../database/entities/user.entity';

export class ReadDocumentDto {
  @ApiProperty({
    example: 'b5c8ef1f-6629-4be4-a570-6826e110b794',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'Contract N2',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'application/pdf',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: DocumentStatuses.DRAFT,
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: '91f775524508900f300ffff6872bb5f806398440',
  })
  @IsString()
  originalHash: string;

  @ApiProperty({
    example: '91f775524508900f300ffff6872bb5f806398440',
  })
  @IsString()
  hash: string;

  @ApiProperty({
    example: '91f775524508900f300ffff6872bb5f806398440',
  })
  @IsString()
  blockchainTransaction: string;

  @ApiProperty({
    example: BlockchainTypes.POLYGON,
  })
  @IsString()
  blockchain: string;

  @ApiProperty({
    example: 'fc027ff1-5e94-4933-9875-78d1b8a9676f',
  })
  @IsString()
  fileStorageId: string;

  @ApiProperty({
    example: 'fc027ff1-5e94-4933-9875-78d1b8a9676f',
  })
  @IsString()
  imageStorageId: string;

  @ApiProperty({
    example: 'abc-rate-wrd',
  })
  @IsString()
  shortId: string;

  @ApiProperty({
    example: 3,
  })
  @IsInt()
  signedBy: number;

  @ApiProperty({
    example: 3,
  })
  @IsInt()
  pagesCount: number;

  @ApiProperty({
    example: 842,
  })
  @IsInt()
  height: number;

  @ApiProperty({
    example: 595,
  })
  @IsInt()
  width: number;

  @ApiProperty({
    example: 165738,
  })
  @IsInt()
  size: number;

  checkSum: string;

  @ApiProperty({
    example: '2021-01-20T12:00:00.000Z',
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    example: '2021-01-20T12:00:00.000Z',
  })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({
    example: [],
  })
  @IsArray()
  users: User[];

  @ApiProperty({
    description: 'link to file',
    example: 'https://storage.googleapis.com',
  })
  @IsString()
  downloadLink: string;

  @ApiProperty({
    description: 'link to preview image',
    example: 'https://storage.googleapis.com',
  })
  @IsString()
  imageLink: string;
}
