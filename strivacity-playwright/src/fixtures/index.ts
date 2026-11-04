import { Page, test as base } from '@playwright/test';
import { createAdminClient } from '../api/createAdminClient';
import { IdentityAdminClient } from '../api/IdentityAdminClient';
import { env } from '../config/env';
import { AppPage } from '../pages/AppPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ForgotUserIdPage } from '../pages/ForgotUserIdPage';
import { LoginPage } from '../pages/LoginPage';
import { MfaPage } from '../pages/MfaPage';
import { RegistrationPage } from '../pages/RegistrationPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { AuthFlow } from '../services/AuthFlow';
import { createMailService } from '../services/createMailService';
import { MailService } from '../services/MailService';
import { TestUser } from '../services/TestUser';
import { UserFactory } from '../services/UserFactory';
import { buildRegistrationData, RegistrationData } from '../utils/registrationData';
import { TotpGenerator } from '../utils/totp';

/** Collects accounts created through the UI (or API) so they are deleted after the test, pass or fail. */
export interface RegistrationCleanup {
  trackUsername(username: string): void;
  trackId(id: string): void;
}

/** A completely separate browser session (no cookies, no SSO session). */
export interface FreshSession {
  page: Page;
  loginPage: LoginPage;
  appPage: AppPage;
}

type TestFixtures = {
  registrationPage: RegistrationPage;
  /** Unique registration form data for this test. */
  newRegistration: RegistrationData;
  registrationCleanup: RegistrationCleanup;
  freshSession: FreshSession;
  loginPage: LoginPage;
  mfaPage: MfaPage;
  forgotPasswordPage: ForgotPasswordPage;
  forgotUserIdPage: ForgotUserIdPage;
  resetPasswordPage: ResetPasswordPage;
  appPage: AppPage;
  auth: AuthFlow;
  userFactory: UserFactory;
  /** Fresh API-created user, password only. Deleted after the test. */
  newUser: TestUser;
  /** Fresh API-created user with an email-OTP authenticator. Deleted after the test. */
  emailMfaUser: TestUser;
};

type WorkerFixtures = {
  admin: IdentityAdminClient;
  mail: MailService;
  /** One TOTP-enrolled user per worker (enrolled once through the UI, then shared read-only). */
  totpUser: TestUser;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // ---------- worker scope: created once per worker ----------
  admin: [
    async ({}, use) => {
      const admin = createAdminClient();
      await use(admin);
      await admin.dispose();
    },
    { scope: 'worker' },
  ],

  mail: [async ({}, use) => { await use(createMailService()); }, { scope: 'worker' }],

  totpUser: [
    async ({ browser, admin, mail }, use) => {
      const factory = new UserFactory(admin, mail);
      const user = await factory.create({ mfa: 'none' }); // API: fast account creation

      const context = await browser.newContext({ baseURL: env.appBaseUrl });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const mfaPage = new MfaPage(page);

      await loginPage.goto();                              // UI: the one thing the API cannot do
      await loginPage.login(user.email, user.password);
      const secret = await mfaPage.enrollTotp();
      const totp = new TotpGenerator(secret);
      await mfaPage.submitCode(await totp.next());
      await context.close();

      await use({ ...user, mfa: { type: 'totp', totp } });
      await factory.cleanup();
    },
    { scope: 'worker' },
  ],

  // ---------- test scope: created per test ----------
  registrationPage: async ({ page }, use) => { await use(new RegistrationPage(page)); },
  newRegistration: async ({}, use) => { await use(buildRegistrationData()); },

  registrationCleanup: async ({ admin }, use) => {
    const usernames: string[] = [];
    const ids: string[] = [];
    await use({ trackUsername: (u) => void usernames.push(u), trackId: (id) => void ids.push(id) });

    // Teardown never fails the test: it only warns, so a cleanup problem cannot hide the real result.
    for (const username of usernames) {
      try {
        const id = await admin.findUserId(username);
        if (id) ids.push(id);
        else console.warn(`[cleanup] account for "${username}" not found; sweep "pwreg-*" users later`);
      } catch (error) {
        console.warn(`[cleanup] lookup failed for "${username}": ${(error as Error).message}`);
      }
    }
    await Promise.allSettled(ids.map((id) => admin.deleteUser(id)));
  },

  freshSession: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: env.appBaseUrl });
    const page = await context.newPage();
    await use({ page, loginPage: new LoginPage(page), appPage: new AppPage(page) });
    await context.close();
  },

  loginPage: async ({ page }, use) => { 
    await use(new LoginPage(page)); 
  },
  mfaPage: async ({ page }, use) => { 
    await use(new MfaPage(page)); 
  },
  forgotPasswordPage: async ({ page }, use) => { 
    await use(new ForgotPasswordPage(page)); 
  },
  forgotUserIdPage: async ({ page }, use) => {
     await use(new ForgotUserIdPage(page)); 
    },
  resetPasswordPage: async ({ page }, use) => { 
    await use(new ResetPasswordPage(page)); 
  },
  appPage: async ({ page }, use) => { 
    await use(new AppPage(page)); },

  auth: async ({ loginPage, mfaPage, mail }, use) => {
     await use(new AuthFlow(loginPage, mfaPage, mail)); 
    },

  userFactory: async ({ admin, mail }, use) => {
    const factory = new UserFactory(admin, mail);
    await use(factory);
    await factory.cleanup(); // runs even when the test fails
  },

  newUser: async ({ userFactory }, use) => { await use(await userFactory.create()); },
  emailMfaUser: async ({ userFactory }, use) => { await use(await userFactory.create({ mfa: 'email' })); },
});

export { expect } from '@playwright/test';
