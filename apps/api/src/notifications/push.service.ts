import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class PushService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    if (!user?.pushToken) {
      if (this.config.get<string>('NODE_ENV') !== 'production') {
        console.log('[Push log-only]', { userId, title, body });
      }
      return;
    }
    try {
      const payload: { to: string; title: string; body: string; sound: string; data?: Record<string, string> } = {
        to: user.pushToken,
        title,
        body,
        sound: 'default',
      };
      if (data && Object.keys(data).length > 0) payload.data = data;
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.warn('[Push] Expo API error', await res.text());
      }
    } catch (e) {
      console.warn('[Push] Failed to send', e);
    }
  }
}
