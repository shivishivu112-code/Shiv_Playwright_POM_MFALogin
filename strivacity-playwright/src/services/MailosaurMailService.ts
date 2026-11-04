import MailosaurClient from 'mailosaur';
import { MailService, WaitOptions } from './MailService';

const DEFAULT_TIMEOUT_MS = 30_000;

export class MailosaurMailService implements MailService {
  private readonly client: MailosaurClient;

  constructor(apiKey: string, private readonly serverId: string) {
    this.client = new MailosaurClient(apiKey);
  }

  addressFor(localPart: string): string {
    return `${localPart}@${this.serverId}.mailosaur.net`;
  }

  async waitForOtp(to: string, opts: WaitOptions = {}): Promise<string> {
    const message = await this.client.messages.get(
      this.serverId,
      { sentTo: to },
      { timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, receivedAfter: opts.since },
    );
    const code = message.text?.codes?.[0]?.value ?? message.html?.codes?.[0]?.value;
    if (!code) throw new Error(`No OTP code found in email "${message.subject}" sent to ${to}`);
    return code;
  }

  async waitForText(to: string, pattern: RegExp, opts: WaitOptions = {}): Promise<string> {
    const message = await this.client.messages.get(
      this.serverId,
      { sentTo: to },
      { timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, receivedAfter: opts.since },
    );
    const match = pattern.exec(message.text?.body ?? '');
    if (!match) throw new Error(`Pattern ${pattern} not found in email "${message.subject}" sent to ${to}`);
    return match[1] ?? match[0];
  }

  async waitForLink(to: string, match: RegExp, opts: WaitOptions = {}): Promise<string> {
    const message = await this.client.messages.get(
      this.serverId,
      { sentTo: to },
      { timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, receivedAfter: opts.since },
    );
    const links = [...(message.html?.links ?? []), ...(message.text?.links ?? [])];
    const link = links.map((l) => l.href).find((href): href is string => !!href && match.test(href));
    if (!link) {
      throw new Error(`No link matching ${match} in email "${message.subject}" sent to ${to}`);
    }
    return link;
  }
}
