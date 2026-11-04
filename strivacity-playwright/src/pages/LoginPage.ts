import { Locator, Page } from '@playwright/test';
import { env } from '../config/env';

export class LoginPage {
  constructor(private readonly page: Page) {}

  get identifierField(): Locator { return this.page.getByRole('textbox', { name: /email|username|identifier/i }); }
  get errorMessage(): Locator { return this.page.getByRole('alert'); }
  get lockedMessage(): Locator { return this.page.getByText(/locked|too many (failed )?attempts/i); }

  /** Opens the app; the app redirects to the IdP hosted login. Waits until the login form is ready. */
  async goto(): Promise<void> {
    await this.page.goto(env.loginStartPath);
    if (env.useDemoNav) {
      await this.page.getByRole('link', { name: 'Login', exact: true }).click();
    }
    await this.identifierField.waitFor();
  }

  /** Handles both layouts: identifier+password on one screen, or two screens. */
  async login(identifier: string, password: string): Promise<void> {
    await this.identifierField.fill(identifier);
    if (env.loginStyle === 'two-step') {
      await this.continueButton.click();
    }
    await this.passwordField.fill(password); // auto-waits for the password field to appear
    await this.continueButton.click();
  }

  async openForgotUserId(): Promise<void> {
    await this.page.getByRole('link', { name: /forgot (your )?(user ?(id|name)|id)/i }).click();
  }

  async openForgotPassword(): Promise<void> {
    await this.page.getByRole('link', { name: /forgot/i }).click();
  }

  private get passwordField(): Locator { return this.page.getByLabel(/^password$/i); }
  private get continueButton(): Locator {
    return this.page.getByRole('button', { name: /continue|next|log in|sign in/i });
  }
}
