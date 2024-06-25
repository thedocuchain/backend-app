import { PartialType } from '@nestjs/swagger';
import { ReadDocumentDto } from './read-document.dto';

export class UpdateDocumentDto extends PartialType(ReadDocumentDto) {}
