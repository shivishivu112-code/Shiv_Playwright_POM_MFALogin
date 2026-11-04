import { test, expect } from '../../src/fixtures';

test.describe('MFA login (TOTP authenticator app)', () => {
  if(!process.env.STRIVACITY_TOTP_SECRET) {
    throw new Error('Missing STRIVACITY_TOTP_SECRET environment variable; cannot run TOTP tests');
  }
  
  test('user signs in with password + TOTP code @smoke', async ({ auth, appPage, totpUser }) => {
    await auth.signIn(totpUser);
    await expect(appPage.signedInMarker).toBeVisible();
  });

  test('wrong TOTP code is rejected', async ({ loginPage, mfaPage, totpUser, appPage }) => {
    await loginPage.goto();
    await loginPage.login(totpUser.email, totpUser.password);
    await mfaPage.submitCode('000000');

    await expect(mfaPage.errorMessage).toBeVisible();
    await expect(appPage.signedInMarker).toBeHidden();
  });
});
