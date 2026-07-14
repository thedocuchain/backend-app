export enum DocumentStatuses {
  DRAFT = 'draft',
  UPLOADED = 'uploaded',
  RECIPIENT_ADDED = 'recipient added',
  SENT = 'sent',
  DELIVERED = 'delivered',
  PARTIALLY_SIGNED = 'partially signed',
  SIGNED = 'signed',
  COMPLETED = 'completed',
  BLOCKCHAINED = 'blockchained',
}

export enum UserRoles {
  SIGNER = 'signer',
  WATCHER = 'watcher',
}

export enum AccountPlan {
  FREE = 'free',
  PRO = 'pro',
  PRO_MAX = 'pro_max',
}

export enum NotifyStatuses {
  NOT_SENT = 'not sent',
  DELIVERED = 'delivered',
  ERROR = 'error',
}

export enum FileLinkTypes {
  IMAGE = 'image',
  DOWNLOAD = 'download',
  PDF = 'pdf',
}

export enum BlockchainTypes {
  POLYGON = 'polygon',
  BSC = 'bsc',
  SOLANA = 'solana',
  MONAD = 'monad',
  BASE = 'base',
  BITCOIN = 'bitcoin',
  SEI = 'sei',
}

export enum AuditLogEventTypes {
  STARTED = 'signing process started',
  COMPLETED = 'signing process completed',
}
