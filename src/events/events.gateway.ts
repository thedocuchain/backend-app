import { Injectable } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  @WebSocketServer() io: Server;
  client: Socket;

  @SubscribeMessage('documents')
  async sendUpdateDocumentStatusMessage(documentId: string) {
    if (this.client && this.client?.id)
      this.io.to(this.client.id).emit('document_status_updated', documentId);
  }
}
