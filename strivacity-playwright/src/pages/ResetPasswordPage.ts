import { Locator, Page } from '@playwright/test';

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  get success(): Locator {
    return this.page.getByText(/password (has been |was )?(reset|changed|updated)|successfully/i);
  }
  get errorMessage(): Locator { return this.page.getByRole('alert'); }
  get invalidLink(): Locator { return this.page.getByText(/invalid|expired|no longer valid/i); }

  /** Opens the link from the reset email. */
  async openLink(url: string): Promise<void> {
    await this.page.goto(url);
  }

  async setPassword(password: string, confirmation = password): Promise<void> {
    await this.page.getByLabel(/^new password/i).fill(password);
    await this.page.getByLabel(/confirm/i).fill(confirmation);
    await this.page.getByRole('button', { name: /reset|save|change|continue|submit/i }).click();
  }
}
