import { Locator, Page } from '@playwright/test';

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  get confirmation(): Locator {
    return this.page.getByText(/check your (e-?mail|inbox)|we('ve| have) sent|instructions/i);
  }

  async requestReset(identifier: string): Promise<void> {
    await this.page.getByRole('textbox', { name: /email|username/i }).fill(identifier);
    await this.page.getByRole('button', { name: /send|continue|reset|submit/i }).click();
  }
}
