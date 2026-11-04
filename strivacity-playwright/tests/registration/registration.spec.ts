import { test, expect } from '../../src/fixtures';
import { buildRegistrationData } from '../../src/utils/registrationData';

test.describe('Registration journey', () => {
  test.beforeEach(async ({ registrationPage }, testInfo) => {
    await registrationPage.goto();

    // The demo header shows "Configuration unavailable. Check that the BFF is running." when its backend is down.
    // Record it in the report so a later failure is easy to explain.
    if (await registrationPage.configWarning.isVisible()) {
      testInfo.annotations.push({
        type: 'warning',
        description: 'App shows "Configuration unavailable": is the BFF running?',
      });
    }
  });

  test('new user registers, then signs in with the same credentials @smoke', async ({
    registrationPage, newRegistration, registrationCleanup, appPage, loginPage, freshSession,
  }) => {
    // Register cleanup FIRST, so the account is removed even if a later step fails.
    registrationCleanup.trackUsername(newRegistration.username);

    // ---- 1. Register through the UI -------------------------------------------------
    await expect(registrationPage.heading).toBeVisible();
    await registrationPage.register(newRegistration);

    // ---- 2. The journey moved on ----------------------------------------------------
    // Heading gone = form accepted (without this, the Username field on the form would
    // also satisfy the login-field check below and give a false pass).
    await expect(registrationPage.heading).toBeHidden({ timeout: 30_000 });
    await expect(registrationPage.validationErrors).toHaveCount(0);

    // Depending on the journey config the user is either signed in already or sent to login.
    // Both mean the account exists.
    await expect(appPage.signedInMarker.or(loginPage.identifierField)).toBeVisible({ timeout: 30_000 });

    // ---- 3. Sign in with the SAME details, in a brand-new browser session ------------
    // A fresh context has no cookies, so the IdP cannot silently reuse the registration session.
    // This guarantees the credentials themselves are what gets us in.
    const { loginPage: freshLogin, appPage: freshApp } = freshSession;
    await freshLogin.goto();
    await freshLogin.login(newRegistration.username, newRegistration.password);

    await expect(freshApp.signedInMarker).toBeVisible({ timeout: 30_000 });
  });

  test('"Back to Login" returns to the login page', async ({ registrationPage, loginPage }) => {
    await registrationPage.backToLogin();

    await expect(registrationPage.heading).toBeHidden();
    await expect(loginPage.identifierField).toBeVisible();
  });

  test('empty form cannot be submitted', async ({ registrationPage, appPage }) => {
    await registrationPage.trySubmit();

    await expect(registrationPage.heading).toBeVisible();   // still on the form
    await expect(appPage.signedInMarker).toBeHidden();
  });

  test('mismatched passwords are rejected', async ({ registrationPage, registrationCleanup }) => {
    const data = buildRegistrationData();
    data.retypePassword = `${data.password}-different`;
    registrationCleanup.trackUsername(data.username); // in case the app wrongly accepts it

    await registrationPage.register(data);

    await expect(registrationPage.heading).toBeVisible();
    await expect(registrationPage.validationErrors.first()).toBeVisible();
  });

  test('both consents are required', async ({ registrationPage, registrationCleanup }) => {
    const data = buildRegistrationData({ acceptEsign: false, acceptDigitalServices: false });
    registrationCleanup.trackUsername(data.username);

    await registrationPage.fillForm(data);
    await registrationPage.trySubmit();

    await expect(registrationPage.heading).toBeVisible();   // blocked: still on the form
    await expect(registrationPage.esignConsent).not.toBeChecked();
    await expect(registrationPage.digitalServicesAgreement).not.toBeChecked();
  });

  test('a username that already exists is rejected', async ({
    registrationPage, newRegistration, registrationCleanup, admin,
  }) => {
    // API: create the existing user instantly (no second UI registration needed)
    const { id } = await admin.createUser({
      username: newRegistration.username,
      password: newRegistration.password,
    });
    registrationCleanup.trackId(id);

    // UI: try to register the same username again
    await registrationPage.register(newRegistration);

    await expect(registrationPage.heading).toBeVisible();
    await expect(registrationPage.validationErrors.first()).toBeVisible();
  });
});
