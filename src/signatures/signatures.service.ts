import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signature } from '../database/entities/signature.entity';
import { User } from '../database/entities/user.entity';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { UpdateSignatureDto } from './dto/update-signature.dto';

@Injectable()
export class SignaturesService {
  constructor(
    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,
  ) {}

  public async create(
    signature: CreateSignatureDto,
    user: User,
  ): Promise<Signature> {
    const newSignature = this.signatureRepository.create(signature);
    newSignature.user = user;

    return await this.signatureRepository.save(newSignature);
  }

  public async update(
    id: string,
    updateSignatureDto: UpdateSignatureDto,
  ): Promise<Signature> {
    const signature = await this.signatureRepository.findOneBy({ id });
    if (!signature) {
      throw new BadRequestException('Signature is not found.');
    }
    return this.signatureRepository.save({
      ...signature,
      ...updateSignatureDto,
    });
  }
}
