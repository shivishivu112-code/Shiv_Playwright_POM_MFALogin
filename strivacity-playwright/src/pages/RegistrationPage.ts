import { Locator, Page } from '@playwright/test';
import { env } from '../config/env';
import { RegistrationData } from '../utils/registrationData';

export class RegistrationPage {
  constructor(private readonly page: Page) {}

  get heading(): Locator { return this.page.getByRole('heading', { name: /create your credentials/i }); }
  get continueButton(): Locator { return this.page.getByRole('button', { name: /^continue$/i }); }
  get validationErrors(): Locator { return this.page.locator('[aria-invalid="true"], [role="alert"]'); }
  get esignConsent(): Locator {
    return this.page.getByRole('checkbox', {
      name: /ESign Consent|Consent to Receive Information Electronically/i,
    });
  }
  get digitalServicesAgreement(): Locator {
    return this.page.getByRole('checkbox', { name: /Digital Services Agreement/i });
  }
  /** The demo header shows this when its BFF is not running. */
  get configWarning(): Locator { return this.page.getByText(/configuration unavailable/i); }

  /** Opens the app and starts the registration journey. */
  async goto(): Promise<void> {
    await this.page.goto(env.registrationStartPath);
    if (env.useDemoNav) {
      await this.page.getByRole('link', { name: 'Registration', exact: true }).click();
    }
    await this.heading.waitFor();
  }

  async fillForm(data: RegistrationData): Promise<void> {
    await this.page.getByLabel(/^username/i).fill(data.username);
    await this.page.getByLabel(/^password/i).fill(data.password);
    await this.page.getByLabel(/re-?type password/i).fill(data.retypePassword ?? data.password);
    await this.page.getByLabel(/given name/i).fill(data.givenName);
    await this.page.getByLabel(/family name/i).fill(data.familyName);

    // setChecked is idempotent and also unchecks, so tests can pass acceptEsign:false
    await this.esignConsent.setChecked(data.acceptEsign ?? true);
    await this.digitalServicesAgreement.setChecked(data.acceptDigitalServices ?? true);
  }

  async submit(): Promise<void> {
    await this.continueButton.click();
  }

  /** Clicks Continue only when it is enabled (some forms disable it until the form is valid). */
  async trySubmit(): Promise<void> {
    if (await this.continueButton.isEnabled()) await this.continueButton.click();
  }

  async register(data: RegistrationData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  async backToLogin(): Promise<void> {
    await this.page.getByRole('link', { name: /back to login/i }).click();
  }
}
