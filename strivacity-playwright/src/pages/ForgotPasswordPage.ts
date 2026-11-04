import { Locator } from '@playwright/test';
import { locators } from '../locators/locators';
import { BasePage } from './BasePage';

const L = locators.forgotPassword;

export class ForgotPasswordPage extends BasePage {
  get confirmation(): Locator { return this.loc(L.confirmation); }

  async requestReset(identifier: string): Promise<void> {
    await this.loc(L.identifier).fill(identifier);
    await this.loc(L.submit).click();
  }
}
