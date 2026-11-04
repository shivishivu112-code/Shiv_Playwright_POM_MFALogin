import { Locator } from '@playwright/test';
import { env } from '../config/env';
import { locators } from '../locators/locators';
import { RegistrationData } from '../utils/registrationData';
import { BasePage } from './BasePage';

const L = locators.registration;

export class RegistrationPage extends BasePage {
  get heading(): Locator { return this.loc(L.heading); }
  get continueButton(): Locator { return this.loc(L.continueButton); }
  get validationErrors(): Locator { return this.loc(L.validationErrors); }
  get esignConsent(): Locator { return this.loc(L.esignConsent); }
  get digitalServicesAgreement(): Locator { return this.loc(L.digitalServicesAgreement); }
  /** The demo header shows this when its BFF is not running. */
  get configWarning(): Locator { return this.loc(locators.app.configWarning); }

  /** Opens the app and starts the registration journey. */
  async goto(): Promise<void> {
    await this.page.goto(env.registrationStartPath);
    if (env.useDemoNav) {
      await this.loc(locators.nav.registration).click();
    }
    await this.heading.waitFor();
  }

  async fillForm(data: RegistrationData): Promise<void> {
    await this.loc(L.username).fill(data.username);
    await this.loc(L.password).fill(data.password);
    await this.loc(L.retypePassword).fill(data.retypePassword ?? data.password);
    await this.loc(L.givenName).fill(data.givenName);
    await this.loc(L.familyName).fill(data.familyName);

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
    await this.loc(L.backToLogin).click();
  }
}
