import { Account } from '../database/entities/account.entity';

export interface PublicAccount {
  id: string;
  email: string;
  name: string;
  avatarImage: string | null;
  signFont: string | null;
  signImage: string | null;
  createdAt: Date;
}

export function toPublicAccount(account: Account): PublicAccount {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    avatarImage: account.avatarImage ?? null,
    signFont: account.signFont ?? null,
    signImage: account.signImage ?? null,
    createdAt: account.createdAt,
  };
}
