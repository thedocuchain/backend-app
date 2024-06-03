import { CreateSignatureDto } from './create-signature.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateSignatureDto extends PartialType(CreateSignatureDto) {}
