import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../database/entities/user.entity';
import { JwtPayload } from './interfaces/token.interface';

@Injectable()
export class AuthService {
  private readonly secret: string | undefined;
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.secret = configService.get<string>('JWT_SECRET');
  }

  async validateUser(
    userId: string,
    documentId: string,
  ): Promise<User | undefined> {
    const user = await this.usersService.findOne(userId);
    if (user && user.document.id === documentId) {
      return user;
    }

    throw new UnauthorizedException(
      'You are not authorized to access this document',
    );
  }

  async sign(userId: string, documentId: string): Promise<string> {
    const payload = { userId, documentId };

    return await this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: '2d',
    });
  }

  async checkAuthorization(userId: string, payload: JwtPayload): Promise<void> {
    if (payload && payload?.userId != userId) {
      throw new BadRequestException(
        'You are not allowed to sign this document.',
      );
    }
  }

  async isExpired(payload: JwtPayload): Promise<boolean> {
    if (!payload) {
      throw new BadRequestException('Invalid token.');
    }
    return payload.exp * 1000 < Date.now();
  }

  async verifyReportToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.secret,
        ignoreExpiration: true,
      });
    } catch (error) {
      throw new BadRequestException('Invalid token.');
    }
  }
}
