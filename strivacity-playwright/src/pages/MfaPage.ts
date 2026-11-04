import { Locator } from '@playwright/test';
import { locators } from '../locators/locators';
import { BasePage } from './BasePage';

const L = locators.mfa;

export class MfaPage extends BasePage {
  get errorMessage(): Locator { return this.loc(L.errorMessage); }
  get codeInput(): Locator { return this.loc(L.codeInput); }

  async submitCode(code: string): Promise<void> {
    await this.loc(L.codeInput).fill(code);
    await this.loc(L.verifyButton).click();
  }

  async resend(): Promise<void> {
    await this.loc(L.resend).click();
  }

  /**
   * First-login TOTP enrollment. Returns the shared secret shown under "can't scan the QR code".
   * (Strivacity's Admin API cannot create TOTP authenticators, so enrollment is done once through the UI.)
   */
  async enrollTotp(): Promise<string> {
    const choose = this.loc(L.chooseTotp);
    const chooserShown = await choose.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false);
    if (chooserShown) await choose.click();

    await this.loc(L.manualEntry).click();
    const secret = (await this.loc(L.totpSecret).textContent())?.trim();
    if (!secret) throw new Error('TOTP secret not found. Update locators.mfa.totpSecret.');
    return secret;
  }
}
