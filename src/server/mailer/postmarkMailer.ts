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
    console.log(`[PostmarkMailer] Attempting to send PIN email to ${to}`);
    try {
      const response = await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: message.subject,
        TextBody: message.textBody,
        HtmlBody: message.htmlBody,
      });
      console.log(`[PostmarkMailer] PIN email sent successfully to ${to}`, {
        messageId: response.MessageID,
        to: response.To,
        submittedAt: response.SubmittedAt,
        errorCode: response.ErrorCode,
      });
    } catch (error: any) {
      console.error(`[PostmarkMailer] Failed to send PIN email to ${to}`, {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
      });
      throw error;
    }
  }

  async sendNewSubscriberNotification(to: string, subscriberUsername: string, subscriberFullName: string): Promise<void> {
    const subject = 'New subscriber to your Slowpost';
    const textBody = `${subscriberFullName} (@${subscriberUsername}) has subscribed to your annual posts!\n\nView their profile: https://slowpost.org/${subscriberUsername}`;
    const htmlBody = `
      <p><strong>${subscriberFullName}</strong> (@${subscriberUsername}) has subscribed to your annual posts!</p>
      <p><a href="https://slowpost.org/${subscriberUsername}">View their profile</a></p>
    `;

    console.log(`[PostmarkMailer] Sending new subscriber notification to ${to}`);
    try {
      const response = await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
      });
      console.log(`[PostmarkMailer] Subscriber notification sent successfully`, { messageId: response.MessageID });
    } catch (error: any) {
      console.error(`[PostmarkMailer] Failed to send subscriber notification`, { error: error.message });
      throw error;
    }
  }

  async sendGroupJoinRequestNotification(to: string, requesterUsername: string, requesterFullName: string, groupName: string, groupDisplayName: string): Promise<void> {
    const subject = `New join request for ${groupDisplayName}`;
    const textBody = `${requesterFullName} (@${requesterUsername}) has requested to join your group "${groupDisplayName}".\n\nView the request: https://slowpost.org/g/${groupName}`;
    const htmlBody = `
      <p><strong>${requesterFullName}</strong> (@${requesterUsername}) has requested to join your group <strong>"${groupDisplayName}"</strong>.</p>
      <p><a href="https://slowpost.org/g/${groupName}">View the request</a></p>
    `;

    console.log(`[PostmarkMailer] Sending group join notification to ${to} for group ${groupName}`);
    try {
      const response = await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
      });
      console.log(`[PostmarkMailer] Group join notification sent successfully`, { messageId: response.MessageID });
    } catch (error: any) {
      console.error(`[PostmarkMailer] Failed to send group join notification`, { error: error.message });
      throw error;
    }
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

    console.log(`[PostmarkMailer] Sending annual letter reminder to ${to}`);
    try {
      const response = await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
      });
      console.log(`[PostmarkMailer] Annual letter reminder sent successfully`, { messageId: response.MessageID });
    } catch (error: any) {
      console.error(`[PostmarkMailer] Failed to send annual letter reminder`, { error: error.message });
      throw error;
    }
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

    console.log(`[PostmarkMailer] Sending annual letter follow-up to ${to}`);
    try {
      const response = await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
      });
      console.log(`[PostmarkMailer] Annual letter follow-up sent successfully`, { messageId: response.MessageID });
    } catch (error: any) {
      console.error(`[PostmarkMailer] Failed to send annual letter follow-up`, { error: error.message });
      throw error;
    }
  }
}

export function createPostmarkMailerFromEnv(): Mailer | undefined {
  // Use stub mailer for e2e tests
  if (process.env.DISABLE_EMAIL === 'true') {
    console.log('[createPostmarkMailerFromEnv] Using stub mailer (DISABLE_EMAIL=true)');
    return new StubMailer();
  }

  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;

  if (!serverToken || !fromEmail) {
    console.warn('[createPostmarkMailerFromEnv] Mailer not configured:', {
      hasServerToken: !!serverToken,
      hasFromEmail: !!fromEmail,
    });
    return undefined;
  }

  console.log('[createPostmarkMailerFromEnv] PostmarkMailer initialized successfully', {
    fromEmail,
    serverTokenPrefix: serverToken.substring(0, 8) + '...',
  });
  return new PostmarkMailer({ serverToken, fromEmail });
}
