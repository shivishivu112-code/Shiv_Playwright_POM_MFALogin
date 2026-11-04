import { Locator } from '@playwright/test';
import { locators } from '../locators/locators';
import { BasePage } from './BasePage';

const L = locators.resetPassword;

export class ResetPasswordPage extends BasePage {
  get success(): Locator { return this.loc(L.success); }
  get errorMessage(): Locator { return this.loc(L.errorMessage); }
  get invalidLink(): Locator { return this.loc(L.invalidLink); }

  /** Opens the link from the reset email. */
  async openLink(url: string): Promise<void> {
    await this.page.goto(url);
  }

  async setPassword(password: string, confirmation = password): Promise<void> {
    await this.loc(L.newPassword).fill(password);
    await this.loc(L.confirmPassword).fill(confirmation);
    await this.loc(L.submit).click();
  }
}
