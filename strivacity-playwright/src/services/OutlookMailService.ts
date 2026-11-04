import { APIRequestContext, request } from '@playwright/test';
import { MailService, WaitOptions } from './MailService';

/**
 * Reads emails from an Outlook / Exchange Online mailbox through Microsoft Graph.
 *
 * Auth:      OAuth2 client-credentials (app registration, APPLICATION permission Mail.Read, admin consent).
 * Endpoint:  GET /v1.0/users/{mailbox}/mailFolders/inbox/messages
 * Isolation: tests share one mailbox, so every test user gets a unique plus-address
 *            (qa.mailbox+<unique>@domain) and we only accept messages addressed to it.
 */
const GRAPH = 'https://graph.microsoft.com/v1.0';
const POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const CLOCK_SKEW_MS = 5_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface OutlookConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailbox: string;     // mailbox that is read
  aliasBase: string;   // base address for unique plus-addresses
}

interface GraphMessage {
  id: string;
  subject: string;
  receivedDateTime: string;
  body: { contentType: 'text' | 'html'; content: string };
  toRecipients: { emailAddress: { address: string } }[];
}

type BodyKind = 'text' | 'html';

export class OutlookMailService implements MailService {
  private ctx?: APIRequestContext;
  private token?: { value: string; expiresAt: number };
  /** Messages already used by a test, so parallel tests never consume the same email twice. */
  private readonly consumed = new Set<string>();

  constructor(private readonly cfg: OutlookConfig) {}

  // ------------------------------------------------------------------ public API

  addressFor(localPart: string): string {
    const [name, domain] = this.cfg.aliasBase.split('@');
    return `${name}+${localPart}@${domain}`;
  }

  async waitForOtp(to: string, opts: WaitOptions = {}): Promise<string> {
    return this.extract(to, opts, 'text', (m) => /\b(\d{4,8})\b/.exec(this.plainText(m))?.[1], 'a 4-8 digit code');
  }

  async waitForText(to: string, pattern: RegExp, opts: WaitOptions = {}): Promise<string> {
    return this.extract(
      to, opts, 'text',
      (m) => {
        const match = pattern.exec(this.plainText(m));
        return match ? (match[1] ?? match[0]) : undefined;
      },
      `pattern ${pattern}`,
    );
  }

  async waitForLink(to: string, match: RegExp, opts: WaitOptions = {}): Promise<string> {
    return this.extract(
      to, opts, 'html', // links need the HTML body: the plain-text rendering drops href targets
      (m) => this.links(m.body.content).find((href) => match.test(href)),
      `a link matching ${match}`,
    );
  }

  // ------------------------------------------------------------------ polling core

  /**
   * Polls the inbox until a message ADDRESSED TO `to`, received after `since`, yields a value from `pick`.
   * The matching message is marked consumed so no other test can reuse it.
   */
  private async extract(
    to: string,
    opts: WaitOptions,
    bodyKind: BodyKind,
    pick: (m: GraphMessage) => string | undefined,
    what: string,
  ): Promise<string> {
    const since = new Date((opts.since ?? new Date(Date.now() - 120_000)).getTime() - CLOCK_SKEW_MS);
    const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    for (;;) {
      const messages = await this.listSince(since, bodyKind);
      for (const message of messages) {
        if (this.consumed.has(message.id) || !this.isSentTo(message, to)) continue;
        const value = pick(message);
        if (value) {
          this.consumed.add(message.id);
          return value;
        }
      }
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${what} in an email to ${to} (mailbox ${this.cfg.mailbox})`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  // ------------------------------------------------------------------ Graph calls

  private async listSince(since: Date, bodyKind: BodyKind): Promise<GraphMessage[]> {
    const ctx = await this.context();
    const url = `${GRAPH}/users/${encodeURIComponent(this.cfg.mailbox)}/mailFolders/inbox/messages`;

    for (let attempt = 1; ; attempt++) {
      const res = await ctx.get(url, {
        params: {
          $filter: `receivedDateTime ge ${since.toISOString()}`,
          $orderby: 'receivedDateTime desc',
          $top: '50',
          $select: 'id,subject,receivedDateTime,body,toRecipients',
        },
        headers: {
          Authorization: `Bearer ${await this.accessToken()}`,
          // ask Graph for a plain-text body (HTML stripped server-side) unless we need links
          ...(bodyKind === 'text' ? { Prefer: 'outlook.body-content-type="text"' } : {}),
        },
      });

      if (res.status() === 401 && attempt < 3) { this.token = undefined; continue; }
      if ((res.status() === 429 || res.status() >= 500) && attempt < 4) {
        const wait = Number(res.headers()['retry-after']);
        await sleep((Number.isFinite(wait) ? wait : 2 ** attempt) * 1000);
        continue;
      }
      if (!res.ok()) throw new Error(`Graph list messages failed: ${res.status()} ${await res.text()}`);

      return ((await res.json()) as { value: GraphMessage[] }).value;
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;

    const ctx = await this.context();
    const res = await ctx.post(`https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/v2.0/token`, {
      form: {
        grant_type: 'client_credentials',
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      },
    });
    if (!res.ok()) throw new Error(`Microsoft token request failed: ${res.status()} ${await res.text()}`);

    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return this.token.value;
  }

  private async context(): Promise<APIRequestContext> {
    if (!this.ctx) this.ctx = await request.newContext();
    return this.ctx;
  }

  // ------------------------------------------------------------------ parsing helpers

  private isSentTo(message: GraphMessage, address: string): boolean {
    const wanted = address.toLowerCase();
    return message.toRecipients.some((r) => r.emailAddress.address.toLowerCase() === wanted);
  }

  /** Plain text of the body, even if Graph returned HTML. */
  private plainText(message: GraphMessage): string {
    const { contentType, content } = message.body;
    if (contentType === 'text') return content;
    return content
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|tr|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ');
  }

  /** Every href and bare URL in an HTML body, entity-decoded. */
  private links(html: string): string[] {
    const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const bare = html.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
    return [...new Set([...hrefs, ...bare].map((u) => u.replace(/&amp;/g, '&')))];
  }
}
