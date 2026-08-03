import { ForbiddenException } from '@nestjs/common';

export const ACCOUNT_FROZEN_CODE = 'ACCOUNT_FROZEN';

export const ACCOUNT_FROZEN_MESSAGE =
  'Your account has been frozen because we received complaints from other users. ' +
  'If you believe this is a mistake, please contact support@docuchain.io';

export function accountFrozenException(): ForbiddenException {
  return new ForbiddenException({
    code: ACCOUNT_FROZEN_CODE,
    message: ACCOUNT_FROZEN_MESSAGE,
  });
}

// A document created strictly before the block moment stays available.
export function isBlockedDocument(blockedAt: Date | null, createdAt: Date): boolean {
  if (!blockedAt) {
    return false;
  }
  return createdAt.getTime() > blockedAt.getTime();
}
