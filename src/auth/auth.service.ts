import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

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

  extractPayload(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: this.secret,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateUser(
    token: string,
  ): Promise<null | { userId: string; documentId: string }> {
    const payload = this.extractPayload(token);
    const user = await this.usersService.findOne(payload.userId);
    if (user && user.document.id === payload.documentId) {
      return payload;
    }

    return null;
  }

  async sign(userId: string, documentId: string): Promise<string> {
    const payload = { userId, documentId };

    return await this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: '1d',
    });
  }
}
