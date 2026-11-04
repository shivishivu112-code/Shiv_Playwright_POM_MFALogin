import { Locator } from '@playwright/test';
import { locators } from '../locators/locators';
import { BasePage } from './BasePage';

const L = locators.forgotUserId;

export class ForgotUserIdPage extends BasePage {
  get confirmation(): Locator { return this.loc(L.confirmation); }

  async requestUserId(email: string): Promise<void> {
    await this.loc(L.email).fill(email);
    await this.loc(L.submit).click();
  }
}
