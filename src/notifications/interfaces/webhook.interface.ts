export type MandrillEventType =
  | 'send'
  | 'deliver'
  | 'deferred'
  | 'hard_bounce'
  | 'soft_bounce'
  | 'open'
  | 'click'
  | 'spam'
  | 'unsub'
  | 'reject';

export interface MandrillMessageMetadata {
  user_id?: string;
  document_id?: string;
  [key: string]: any;
}

export interface MandrillMessage {
  ts?: number;
  _id?: string;
  email: string;
  subject?: string;
  sender?: string;
  state?: string;
  tags?: string[];
  metadata?: MandrillMessageMetadata;
}

export interface MandrillEvent {
  event: MandrillEventType;
  msg: MandrillMessage;
  ts: number;
  _id?: string;
}
