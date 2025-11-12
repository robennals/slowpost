import { ServerClient } from 'postmark';
import type { Mailer } from '../api/types';

class StubMailer implements Mailer {
  async sendPinEmail(_to: string, _pin: string): Promise<void> {
    // No-op for e2e tests
  }

  async sendNewSubscriberNotification(_to: string, _subscriberUsername: string, _subscriberFullName: string): Promise<void> {
    // No-op for e2e tests
  }

  async sendGroupJoinRequestNotification(_to: string, _requesterUsername: string, _requesterFullName: string, _groupName: string, _groupDisplayName: string): Promise<void> {
    // No-op for e2e tests
  }

  async sendAnnualLetterReminder(_to: string, _fullName: string, _username: string, _subscriberCount: number, _expectedMonth: string): Promise<void> {
    // No-op for e2e tests
  }

  async sendAnnualLetterFollowUp(_to: string, _fullName: string, _username: string, _subscriberCount: number, _expectedMonth: string): Promise<void> {
    // No-op for e2e tests
  }
}

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

  async sendNewSubscriberNotification(to: string, subscriberUsername: string, subscriberFullName: string): Promise<void> {
    const subject = 'New subscriber to your Slowpost';
    const textBody = `${subscriberFullName} (@${subscriberUsername}) has subscribed to your annual posts!\n\nView their profile: https://slowpost.org/${subscriberUsername}`;
    const htmlBody = `
      <p><strong>${subscriberFullName}</strong> (@${subscriberUsername}) has subscribed to your annual posts!</p>
      <p><a href="https://slowpost.org/${subscriberUsername}">View their profile</a></p>
    `;

    await this.client.sendEmail({
      From: this.fromEmail,
      To: to,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
    });
  }

  async sendGroupJoinRequestNotification(to: string, requesterUsername: string, requesterFullName: string, groupName: string, groupDisplayName: string): Promise<void> {
    const subject = `New join request for ${groupDisplayName}`;
    const textBody = `${requesterFullName} (@${requesterUsername}) has requested to join your group "${groupDisplayName}".\n\nView the request: https://slowpost.org/g/${groupName}`;
    const htmlBody = `
      <p><strong>${requesterFullName}</strong> (@${requesterUsername}) has requested to join your group <strong>"${groupDisplayName}"</strong>.</p>
      <p><a href="https://slowpost.org/g/${groupName}">View the request</a></p>
    `;

    await this.client.sendEmail({
      From: this.fromEmail,
      To: to,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
    });
  }

  async sendAnnualLetterReminder(to: string, fullName: string, username: string, subscriberCount: number, expectedMonth: string): Promise<void> {
    const subject = `Time to send your ${expectedMonth} annual letter!`;
    const subscriberText = subscriberCount === 1 ? '1 subscriber is' : `${subscriberCount} subscribers are`;
    const textBody = `Hi ${fullName},\n\nYou mentioned you'd send your annual letter in ${expectedMonth}. ${subscriberText} waiting to hear from you!\n\nView your subscribers: https://slowpost.org/subscribers\n\nOnce you've sent your letter, mark it as done: https://slowpost.org/\n\nNeed inspiration? Check out our letter writing guide: https://slowpost.org/pages/writing-a-good-letter.html`;
    const htmlBody = `
      <p>Hi ${fullName},</p>
      <p>You mentioned you'd send your annual letter in <strong>${expectedMonth}</strong>. ${subscriberText} waiting to hear from you!</p>
      <p><a href="https://slowpost.org/subscribers">View your subscribers</a></p>
      <p>Once you've sent your letter, <a href="https://slowpost.org/">mark it as done</a>.</p>
      <p>Need inspiration? Check out our <a href="https://slowpost.org/pages/writing-a-good-letter.html">letter writing guide</a>.</p>
    `;

    await this.client.sendEmail({
      From: this.fromEmail,
      To: to,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
    });
  }

  async sendAnnualLetterFollowUp(to: string, fullName: string, username: string, subscriberCount: number, expectedMonth: string): Promise<void> {
    const subject = `Don't forget your annual letter`;
    const subscriberText = subscriberCount === 1 ? '1 subscriber is' : `${subscriberCount} subscribers are`;
    const textBody = `Hi ${fullName},\n\nJust a gentle reminder that ${subscriberText} still waiting for your ${expectedMonth} annual letter.\n\nIf you've already sent it, you can mark it as done here: https://slowpost.org/\n\nNeed help getting started? Check out our letter writing guide: https://slowpost.org/pages/writing-a-good-letter.html`;
    const htmlBody = `
      <p>Hi ${fullName},</p>
      <p>Just a gentle reminder that ${subscriberText} still waiting for your ${expectedMonth} annual letter.</p>
      <p>If you've already sent it, you can <a href="https://slowpost.org/">mark it as done</a>.</p>
      <p>Need help getting started? Check out our <a href="https://slowpost.org/pages/writing-a-good-letter.html">letter writing guide</a>.</p>
    `;

    await this.client.sendEmail({
      From: this.fromEmail,
      To: to,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
    });
  }
}

export function createPostmarkMailerFromEnv(): Mailer | undefined {
  // Use stub mailer for e2e tests
  if (process.env.DISABLE_EMAIL === 'true') {
    return new StubMailer();
  }

  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;

  if (!serverToken || !fromEmail) {
    return undefined;
  }

  return new PostmarkMailer({ serverToken, fromEmail });
}
