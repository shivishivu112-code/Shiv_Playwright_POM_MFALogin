/**
 * Provider-agnostic contract for test-data and account-state operations.
 *
 * Tests and fixtures depend on THIS interface only. To support Okta or Ping, add
 * `OktaAdminClient implements IdentityAdminClient` and register it in createAdminClient().
 */
export interface CreateUserInput {
  /** Provide the identifier(s) your identity store uses: email, username, or both. */
  email?: string;
  username?: string;
  password: string;
}

export interface IdentityAdminClient {
  /** Fails fast if credentials / tenant / identity store are wrong. */
  ping(): Promise<void>;
  createUser(input: CreateUserInput): Promise<{ id: string }>;
  deleteUser(id: string): Promise<void>;
  /** Best-effort lookup of an account id by login identifier (used to clean up UI-registered users). */
  findUserId(identifier: string): Promise<string | undefined>;
  /** Registers an email OTP authenticator so the user is challenged with an emailed code. */
  addEmailMfa(userId: string, email: string): Promise<void>;
  /** Administratively locks the account. */
  lockUser(userId: string): Promise<void>;
  /** Lifts a lock caused by failed password attempts. */
  unlockUser(userId: string): Promise<void>;
  dispose(): Promise<void>;
}
