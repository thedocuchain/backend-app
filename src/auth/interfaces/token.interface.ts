export interface JwtPayload {
  userId: string;
  documentId: string;
  iat: number;
  exp: number;
}
