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

export enum NotifyStatuses {
  NOT_SENT = 'not sent',
  DELIVERED = 'delivered',
}

export enum FileLinkTypes {
  IMAGE = 'image',
  DOWNLOAD = 'download',
  PDF = 'pdf',
}
