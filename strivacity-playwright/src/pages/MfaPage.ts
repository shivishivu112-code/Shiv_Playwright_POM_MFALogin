import { Locator, Page } from '@playwright/test';

export class MfaPage {
  constructor(private readonly page: Page) {}

  get errorMessage(): Locator { return this.page.getByRole('alert'); }
  get codeInput(): Locator { return this.page.getByRole('textbox', { name: /code/i }); }

  async submitCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.page.getByRole('button', { name: /verify|continue|submit/i }).click();
  }

  async resend(): Promise<void> {
    await this.page.getByRole('button', { name: /resend/i }).click();
  }

  /**
   * First-login TOTP enrollment. Returns the shared secret shown under "can't scan the QR code".
   * (Strivacity's Admin API cannot create TOTP authenticators, so enrollment is done once through the UI.)
   */
  async enrollTotp(): Promise<string> {
    const choose = this.page.getByRole('button', { name: /authenticator app|totp/i });
    const chooserShown = await choose.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false);
    if (chooserShown) await choose.click();

    await this.page.getByRole('button', { name: /can.?t scan|enter .*manually|manual/i }).click();
    const secret = (await this.totpSecret.textContent())?.trim();
    if (!secret) throw new Error('TOTP secret not found. Update MfaPage.totpSecret.');
    return secret;
  }

  private get totpSecret(): Locator { return this.page.getByTestId('totp-secret'); }
}
