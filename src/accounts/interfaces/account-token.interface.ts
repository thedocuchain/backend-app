export interface AccountJwtPayload {
  accountId: string;
  sessionId: string;
  iat: number;
  exp: number;
}
