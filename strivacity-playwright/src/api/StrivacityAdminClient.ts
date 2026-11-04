import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { findAccountId } from '../utils/findAccountId';
import { CreateUserInput, IdentityAdminClient } from './IdentityAdminClient';

/**
 * Strivacity Admin API client.
 *
 * Auth:   OIDC client-credentials against https://{tenant}/oauth2/token  (audience = https://{tenant})
 * Base:   https://{tenant}/admin/api/v1
 * Docs:   https://docs.strivacity.com/reference/getting-started-with-the-admin-api
 *
 * Scopes are "<read|write|delete>:<entity>". The API client must be an "OIDC using no-code components"
 * client with interactive login disabled and an API access policy granting the scopes below.
 */
const SCOPES = ['read:account', 'write:account', 'delete:account', 'write:account_authenticator'];
const RETRYABLE = new Set([429, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface StrivacityConfig {
  tenant: string;          // e.g. brand.strivacity.com
  identityStore: string;   // identity store name
  clientId: string;
  clientSecret: string;
  lockType: string;        // body.type for the lock endpoint
}

export class StrivacityAdminClient implements IdentityAdminClient {
  private ctx?: APIRequestContext;
  private token?: { value: string; expiresAt: number };

  constructor(private readonly cfg: StrivacityConfig) {}

  private get accountsPath(): string {
    return `/admin/api/v1/identityStores/${encodeURIComponent(this.cfg.identityStore)}/accounts`;
  }

  private async context(): Promise<APIRequestContext> {
    if (!this.ctx) this.ctx = await request.newContext({ baseURL: `https://${this.cfg.tenant}` });
    return this.ctx;
  }

  /** Cached bearer token, refreshed 30s before expiry. */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 30_000) return this.token.value;

    const ctx = await this.context();
    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString('base64');
    const res = await ctx.post('/oauth2/token', {
      headers: { Authorization: `Basic ${basic}` },
      form: {
        grant_type: 'client_credentials',
        audience: `https://${this.cfg.tenant}`,
        scope: SCOPES.join(' '),
      },
    });
    if (!res.ok()) {
      throw new Error(`Strivacity token request failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return this.token.value;
  }

  /** One place for auth, JSON, retries on rate limiting / transient errors, and readable failures. */
  private async call(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    opts: { data?: unknown; headers?: Record<string, string>; okStatuses?: number[] } = {},
  ): Promise<APIResponse> {
    const ctx = await this.context();
    const ok = opts.okStatuses ?? [];

    for (let attempt = 1; ; attempt++) {
      const res = await ctx.fetch(path, {
        method,
        data: opts.data,
        headers: {
          Authorization: `Bearer ${await this.accessToken()}`,
          Accept: 'application/json',
          ...opts.headers,
        },
      });

      if (RETRYABLE.has(res.status()) && attempt < 4) {
        const retryAfter = Number(res.headers()['retry-after']);
        await sleep((Number.isFinite(retryAfter) ? retryAfter : 2 ** attempt) * 1000);
        continue;
      }
      if (!res.ok() && !ok.includes(res.status())) {
        throw new Error(`${method} ${path} -> ${res.status()}: ${await res.text()}`);
      }
      return res;
    }
  }

  async ping(): Promise<void> {
    await this.accessToken();
    await this.call('GET', this.accountsPath); // proves the identity store exists and scopes work
  }

  async createUser({ email, username, password }: CreateUserInput): Promise<{ id: string }> {
    if (!email && !username) throw new Error('createUser needs an email and/or a username');

    const res = await this.call('POST', this.accountsPath, {
      data: {
        // identifiers are set per the identity store: username = local.id, email = email.id
        ...(email ? { email: { id: email } } : {}),
        ...(username ? { local: { id: username } } : {}),
        language: 'en-US',
        password,
        skipPasswordPolicy: true,
      },
      headers: { 'X-Skip-Email-Verification': 'true' }, // no verification email for API-created users
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const fromLocation = res.headers()['location']?.split('/').pop();
    const id = (body.id ?? body.accountId ?? fromLocation) as string | undefined;
    if (!id) {
      throw new Error(`Account created but no id found in response: ${JSON.stringify(body)}`);
    }
    return { id };
  }

  async deleteUser(id: string): Promise<void> {
    await this.call('DELETE', `${this.accountsPath}/${id}`, { okStatuses: [404] }); // already gone is fine
  }

  /**
   * Best effort: scans the first page of the accounts list for the identifier.
   * (List filtering/pagination parameters are not relied upon; confirm them in your OpenAPI spec for large tenants.)
   */
  async findUserId(identifier: string): Promise<string | undefined> {
    const res = await this.call('GET', this.accountsPath);
    return findAccountId(await res.json(), identifier);
  }

  async addEmailMfa(userId: string, email: string): Promise<void> {
    await this.call('POST', `${this.accountsPath}/${userId}/authenticators`, {
      data: { type: 'email', target: email },
      headers: { 'X-Skip-Email-Verification': 'true' },
    });
  }

  async lockUser(userId: string): Promise<void> {
    await this.call('POST', `${this.accountsPath}/${userId}/lock`, {
      data: { type: this.cfg.lockType },
    });
  }

  async unlockUser(userId: string): Promise<void> {
    await this.call('POST', `${this.accountsPath}/${userId}/liftPasswordLock`);
  }

  async dispose(): Promise<void> {
    await this.ctx?.dispose();
  }
}
