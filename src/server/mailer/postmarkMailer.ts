import { ServerClient } from 'postmark';
import type { Mailer } from '../api/types';

export interface PostmarkMailerOptions {
  serverToken: string;
  fromEmail: string;
  messageFactory?: (params: { to: string; pin: string }) => { subject: string; textBody: string; htmlBody?: string };
}

export class PostmarkMailer implements Mailer {
  private client: ServerClient;
  private fromEmail: string;
  private messageFactory: Required<PostmarkMailerOptions>['messageFactory'];

  constructor(options: PostmarkMailerOptions) {
    this.client = new ServerClient(options.serverToken);
    this.fromEmail = options.fromEmail;
    this.messageFactory = options.messageFactory ?? (({ to, pin }) => ({
      subject: 'Your Slowpost login PIN',
      textBody: `Use this PIN to finish signing in: ${pin}`,
    }));
  }

  async sendPinEmail(to: string, pin: string): Promise<void> {
    const message = this.messageFactory({ to, pin });
    await this.client.sendEmail({
      From: this.fromEmail,
      To: to,
      Subject: message.subject,
      TextBody: message.textBody,
      HtmlBody: message.htmlBody,
    });
  }
}

export function createPostmarkMailerFromEnv(): Mailer | undefined {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;

  if (!serverToken || !fromEmail) {
    return undefined;
  }

  return new PostmarkMailer({ serverToken, fromEmail });
}
