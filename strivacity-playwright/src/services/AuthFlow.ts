import { LoginPage } from '../pages/LoginPage';
import { MfaPage } from '../pages/MfaPage';
import { MailService } from './MailService';
import { TestUser } from './TestUser';

/**
 * Reusable "sign in as this user" flow that knows which MFA challenge to answer.
 * Specs call `auth.signIn(user)` instead of repeating login + MFA steps.
 */
export class AuthFlow {
  constructor(
    private readonly loginPage: LoginPage,
    private readonly mfaPage: MfaPage,
    private readonly mail: MailService,
  ) {}

  async signIn(user: TestUser): Promise<void> {
    const since = new Date(Date.now() - 5_000); // small allowance for clock skew with the mail server

    await this.loginPage.goto();
    await this.loginPage.login(user.email, user.password);
    await this.answerMfa(user, since);
  }

  /** Answers the MFA challenge shown after the password step (no-op for users without MFA). */
  async answerMfa(user: TestUser, since = new Date(Date.now() - 5_000)): Promise<void> {
    switch (user.mfa.type) {
      case 'none':
        return;
      case 'email':
        await this.mfaPage.submitCode(await this.mail.waitForOtp(user.email, { since }));
        return;
      case 'totp':
        await this.mfaPage.submitCode(await user.mfa.totp.next());
        return;
    }
  }
}
