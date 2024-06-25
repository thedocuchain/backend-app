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

  isClientConnected(): boolean {
    return !!this.client && this.client.connected;
  }

  @SubscribeMessage('documents')
  async sendUpdateDocumentStatusMessage(documentId: string) {
    if (this.isClientConnected()) {
      this.io.to(this.client.id).emit('document_status_updated', documentId);
    } else {
      console.log('No client connected to emit message');
    }
  }
}
