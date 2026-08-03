import { Account } from '../database/entities/account.entity';
import { AccountPlan } from '../common/enums/entities.enum';

export interface PublicAccount {
  id: string;
  email: string;
  name: string;
  avatarImage: string | null;
  signFont: string | null;
  signImage: string | null;
  plan: AccountPlan;
  frozen: boolean;
  createdAt: Date;
}

export function toPublicAccount(account: Account, frozen = false): PublicAccount {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    avatarImage: account.avatarImage ?? null,
    signFont: account.signFont ?? null,
    signImage: account.signImage ?? null,
    plan: account.plan ?? AccountPlan.FREE,
    frozen,
    createdAt: account.createdAt,
  };
}
