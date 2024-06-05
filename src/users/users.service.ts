import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Document } from '../database/entities/document.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async create(user: CreateUserDto, document: Document): Promise<User> {
    const newUser = this.userRepository.create(user);
    newUser.document = document;

    return await this.userRepository.save(newUser);
  }

  public async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new BadRequestException('User is not found.');
    }

    await this.userRepository.save({ ...user, ...updateUserDto });
    return this.findOne(id);
  }

  public async findOne(id: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.document', 'document')
      .leftJoinAndSelect('user.signatures', 'signature')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new BadRequestException('User is not found.');
    }

    return user;
  }
}
