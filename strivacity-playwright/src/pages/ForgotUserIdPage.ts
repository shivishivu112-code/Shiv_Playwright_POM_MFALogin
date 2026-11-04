import { Locator, Page } from '@playwright/test';

export class ForgotUserIdPage {
  constructor(private readonly page: Page) {}

  get confirmation(): Locator {
    return this.page.getByText(/check your (e-?mail|inbox)|we('ve| have) sent|instructions/i);
  }

  async requestUserId(email: string): Promise<void> {
    await this.page.getByRole('textbox', { name: /email/i }).fill(email);
    await this.page.getByRole('button', { name: /send|continue|submit/i }).click();
  }
}
