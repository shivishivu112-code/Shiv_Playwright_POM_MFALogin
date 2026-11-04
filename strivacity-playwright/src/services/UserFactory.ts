import { IdentityAdminClient } from '../api/IdentityAdminClient';
import { strongPassword, uniqueLocalPart } from '../utils/password';
import { MailService } from './MailService';
import { TestUser } from './TestUser';

/**
 * Creates throw-away users through the ADMIN API (fast, deterministic) and removes them afterwards.
 * Every test gets its own user, so tests never share state and can run in parallel.
 */
export class UserFactory {
  private readonly createdIds: string[] = [];

  constructor(private readonly admin: IdentityAdminClient, private readonly mail: MailService) {}

  async create(opts: { mfa?: 'none' | 'email' } = {}): Promise<TestUser> {
    const email = this.mail.addressFor(uniqueLocalPart());
    const password = strongPassword();

    const { id } = await this.admin.createUser({ email, password });
    this.createdIds.push(id); // register for cleanup BEFORE further setup so failures still clean up

    if (opts.mfa === 'email') await this.admin.addEmailMfa(id, email);

    return { id, email, password, mfa: { type: opts.mfa === 'email' ? 'email' : 'none' } };
  }

  async cleanup(): Promise<void> {
    await Promise.allSettled(this.createdIds.map((id) => this.admin.deleteUser(id)));
    this.createdIds.length = 0;
  }
}
