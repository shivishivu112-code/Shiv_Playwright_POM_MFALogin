import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';

test.describe('User ID delivered by email', () => {
  test('user reads the User ID from the email and signs in with it @smoke', async ({
    loginPage, forgotUserIdPage, appPage, mail, newUser,
  }) => {
    // 1. UI: trigger the email (replace with whatever flow sends the user id in your app)
    const requestedAt = new Date();
    await loginPage.goto();
    await loginPage.openForgotUserId();
    await forgotUserIdPage.requestUserId(newUser.email);
    await expect(forgotUserIdPage.confirmation).toBeVisible();

    // 2. Mail: poll Outlook, take the message addressed to THIS test's alias, extract the id
    const userId = await mail.waitForText(newUser.email, env.userIdPattern, { since: requestedAt });

    // 3. UI: type the extracted id into the login user id field
    await loginPage.goto();
    await loginPage.login(userId, newUser.password);

    await expect(appPage.signedInMarker).toBeVisible();
  });
});
