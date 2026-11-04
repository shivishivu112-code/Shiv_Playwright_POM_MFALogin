import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';

test.describe('Account lock / unlock', () => {
  test('admin-locked account cannot sign in; unlocking via API restores access @smoke', async ({
    admin, auth, loginPage, appPage, newUser,
  }) => {
    await admin.lockUser(newUser.id);                       // API: instant, no UI loop

    await loginPage.goto();
    await loginPage.login(newUser.email, newUser.password);
    await expect(loginPage.lockedMessage).toBeVisible();    // UI: what the customer sees

    await admin.unlockUser(newUser.id);                     // API: unlock
    await auth.signIn(newUser);                             // UI: access restored
    await expect(appPage.signedInMarker).toBeVisible();
  });

  // Real brute-force behaviour: slow by nature (N UI attempts), so tagged @slow and run less often.
  test('account locks after repeated wrong passwords, even the correct one is then refused @slow', async ({
    admin, loginPage, appPage, newUser,
  }) => {
    for (let attempt = 1; attempt <= env.lockoutThreshold; attempt++) {
      await loginPage.goto();
      await loginPage.login(newUser.email, `Wrong-${attempt}-Password!`);
    }

    await loginPage.goto();
    await loginPage.login(newUser.email, newUser.password); // correct password
    await expect(loginPage.lockedMessage).toBeVisible();
    await expect(appPage.signedInMarker).toBeHidden();

    await admin.unlockUser(newUser.id);
    await loginPage.goto();
    await loginPage.login(newUser.email, newUser.password);
    await expect(appPage.signedInMarker).toBeVisible();
  });
});
