import { Locator } from '@playwright/test';
import { env } from '../config/env';
import { locators } from '../locators/locators';
import { BasePage } from './BasePage';

const L = locators.login;

export class LoginPage extends BasePage {
  get identifierField(): Locator { return this.loc(L.identifier); }
  get errorMessage(): Locator { return this.loc(L.errorMessage); }
  get lockedMessage(): Locator { return this.loc(L.lockedMessage); }

  /** Opens the app; the app redirects to the IdP hosted login. Waits until the login form is ready. */
  async goto(): Promise<void> {
    await this.page.goto(env.loginStartPath);
    if (env.useDemoNav) {
      await this.loc(locators.nav.login).click();
    }
    await this.loc(L.identifier).waitFor();
  }

  /** Handles both layouts: identifier+password on one screen, or two screens. */
  async login(identifier: string, password: string): Promise<void> {
    await this.loc(L.identifier).fill(identifier);
    if (env.loginStyle === 'two-step') {
      await this.loc(L.continueButton).click();
    }
    await this.loc(L.password).fill(password); // auto-waits for the password field to appear
    await this.loc(L.continueButton).click();
  }

  async openForgotUserId(): Promise<void> {
    await this.loc(L.forgotUserId).click();
  }

  async openForgotPassword(): Promise<void> {
    await this.loc(L.forgotPassword).click();
  }
}
