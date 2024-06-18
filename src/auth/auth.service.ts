import { Injectable } from '@nestjs/common';
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

  async validateUser(
    userId: string,
    documentId: string,
  ): Promise<null | { userId: string; documentId: string }> {
    const user = await this.usersService.findOne(userId);
    if (user && user.document.id === documentId) {
      return { userId, documentId };
    }

    return null;
  }

  async sign(
    userId: string,
    documentId: string,
  ): Promise<{ access_token: string }> {
    const payload = { userId, documentId };

    return {
      access_token: await this.jwtService.signAsync(payload, {
        secret: this.secret,
        expiresIn: '1d',
      }),
    };
  }
}
