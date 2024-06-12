interface Signature {
  token: string;
  timestamp: string;
  signature: string;
}

interface DeliveryStatus {
  tls: boolean;
  'mx-host': string;
  code: number;
  description: string;
  'session-seconds': number;
  utf8: boolean;
  'attempt-no': number;
  message: string;
  'certificate-verified': boolean;
}

interface Flags {
  is_routed: boolean;
  'is-authenticated': boolean;
  'is-system-test': boolean;
  'is-test-mode': boolean;
}

interface Envelope {
  transport: string;
  sender: string;
  'sending-ip': string;
  targets: string;
}

interface Message {
  headers: { [key: string]: any };
  attachments: any[];
  size: number;
}

interface Storage {
  url: string;
  key: string;
}

interface EventData {
  id: string;
  timestamp: number;
  'log-level': string;
  event: string;
  'delivery-status': DeliveryStatus;
  flags: Flags;
  envelope: Envelope;
  message: Message;
  recipient: string;
  'recipient-domain': string;
  storage: Storage;
  campaigns: string[];
  tags: string[];
  'user-variables': { [key: string]: any };
}

export interface MailgunEvent {
  signature: Signature;
  'event-data': EventData;
}
