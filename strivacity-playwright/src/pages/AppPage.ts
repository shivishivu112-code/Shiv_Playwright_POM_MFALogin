import { Locator, Page } from '@playwright/test';

/** The application the user lands on after a successful login. */
export class AppPage {
  constructor(private readonly page: Page) {}

  get signedInMarker(): Locator { 
    return this.page.getByTestId('user-menu'); }

  async signOut(): Promise<void> {
    await this.page.getByRole('button', { name: /sign out|log out/i }).click();
  }
}
