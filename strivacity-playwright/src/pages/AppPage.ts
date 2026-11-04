import { Locator } from '@playwright/test';
import { locators } from '../locators/locators';
import { BasePage } from './BasePage';

const L = locators.app;

/** The application the user lands on after a successful login. */
export class AppPage extends BasePage {
  get signedInMarker(): Locator { return this.loc(L.signedInMarker); }

  async signOut(): Promise<void> {
    await this.loc(L.signOut).click();
  }
}
