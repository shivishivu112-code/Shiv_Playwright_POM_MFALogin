import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';

test.describe('MFA login (email OTP)', () => {
  test('user signs in with password + emailed OTP @smoke', async ({ auth, appPage, emailMfaUser, page }) => {
    await auth.signIn(emailMfaUser);

    await expect(page).toHaveURL(env.postLoginUrlPattern);
    await expect(appPage.signedInMarker).toBeVisible();
  });

  test('wrong OTP is rejected', async ({ loginPage, mfaPage, emailMfaUser, appPage }) => {
    await loginPage.goto();
    await loginPage.login(emailMfaUser.email, emailMfaUser.password);
    await mfaPage.submitCode('000000');

    await expect(mfaPage.errorMessage).toBeVisible();
    await expect(appPage.signedInMarker).toBeHidden();
  });

  test('resend delivers a new working code', async ({ loginPage, mfaPage, mail, emailMfaUser, appPage }) => {
    await loginPage.goto();
    await loginPage.login(emailMfaUser.email, emailMfaUser.password);

    const resentAt = new Date();
    await mfaPage.resend();
    await mfaPage.submitCode(await mail.waitForOtp(emailMfaUser.email, { since: resentAt }));

    await expect(appPage.signedInMarker).toBeVisible();
  });
});
