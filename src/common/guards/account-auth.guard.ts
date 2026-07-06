import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AccountAuthGuard extends AuthGuard('account-jwt') {}
