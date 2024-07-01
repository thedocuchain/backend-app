import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly botToken: string;
  private readonly chatId: string;
  constructor(private readonly configService: ConfigService) {
    this.botToken = configService.get<string>('TG_BOT_TOKEN');
    this.chatId = configService.get<string>('TG_CHAT_ID');
  }

  async sendMessage(message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML',
    };

    try {
      await axios.post(url, payload);
    } catch (error) {
      throw new Error('Failed to send message');
    }
  }
}
