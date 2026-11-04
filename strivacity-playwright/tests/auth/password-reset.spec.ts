import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { strongPassword } from '../../src/utils/password';

test.describe('Password reset', () => {
  test('user resets password from the emailed link and signs in with it @smoke', async ({
    loginPage, forgotPasswordPage, resetPasswordPage, auth, appPage, mail, newUser,
  }) => {
    const newPassword = strongPassword();

    // UI: the journey under test
    await loginPage.goto();
    await loginPage.openForgotPassword();
    await forgotPasswordPage.requestReset(newUser.email);
    await expect(forgotPasswordPage.confirmation).toBeVisible();

    // Mail: fetch the link (deterministic, no sleeps)
    const link = await mail.waitForLink(newUser.email, env.resetLinkPattern);

    // UI: complete the reset
    await resetPasswordPage.openLink(link);
    await resetPasswordPage.setPassword(newPassword);
    await expect(resetPasswordPage.success).toBeVisible();

    // UI: prove the new password works
    await auth.signIn({ ...newUser, password: newPassword });
    await expect(appPage.signedInMarker).toBeVisible();
  });

  test('unknown email gets the same confirmation (no account enumeration)', async ({
    loginPage, forgotPasswordPage,
  }) => {
    await loginPage.goto();
    await loginPage.openForgotPassword();
    await forgotPasswordPage.requestReset('nobody-here@example.com');

    await expect(forgotPasswordPage.confirmation).toBeVisible();
  });

  test('mismatched passwords are rejected', async ({
    loginPage, forgotPasswordPage, resetPasswordPage, mail, newUser,
  }) => {
    await loginPage.goto();
    await loginPage.openForgotPassword();
    await forgotPasswordPage.requestReset(newUser.email);
    await resetPasswordPage.openLink(await mail.waitForLink(newUser.email, env.resetLinkPattern));

    await resetPasswordPage.setPassword(strongPassword(), strongPassword());

    await expect(resetPasswordPage.errorMessage).toBeVisible();
  });

  test('reset link cannot be used twice', async ({
    loginPage, forgotPasswordPage, resetPasswordPage, mail, newUser,
  }) => {
    await loginPage.goto();
    await loginPage.openForgotPassword();
    await forgotPasswordPage.requestReset(newUser.email);
    const link = await mail.waitForLink(newUser.email, env.resetLinkPattern);

    await resetPasswordPage.openLink(link);
    await resetPasswordPage.setPassword(strongPassword());
    await expect(resetPasswordPage.success).toBeVisible();

    await resetPasswordPage.openLink(link);
    await expect(resetPasswordPage.invalidLink).toBeVisible();
  });
});
