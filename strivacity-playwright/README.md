# Strivacity CIAM Playwright Framework (API + UI hybrid)

Reusable end-to-end framework for testing a COTS identity provider's hosted login journeys.
Strivacity is implemented first; Okta / Ping plug in through two small interfaces.

Covers: **email-OTP MFA login, TOTP MFA login, password reset, account lock/unlock.**

> UI selectors in the page objects are placeholders. Inspect your tenant's pages and adjust them in the corresponding page class.

## Why hybrid?

Pure-UI CIAM tests are slow and flaky because every test repeats registration, enrollment and lockout
setup through screens you do not control. Here:

| Job | Done by | Why |
|---|---|---|
| Create / delete test users | **Admin API** | Fast, deterministic, parallel-safe |
| Add email-OTP authenticator | **Admin API** | One call instead of an enrollment journey |
| Lock / unlock account | **Admin API** | No 5x failed-login loop |
| Read reset links and OTP emails | **Mail API** (Mailosaur) | No sleeps, no inbox scraping |
| Generate TOTP codes | **Library** (`otpauth`) | Replay-safe, window-safe |
| The journey being tested (login, MFA prompt, forgot/reset pages, lock message) | **UI** | This is what we are actually verifying |
| First TOTP enrollment | **UI, once per worker** | Admin API only creates `email`/`phone`/`custom` authenticators |

## Structure

```
playwright.config.ts          projects: api-health (gate) -> chromium
src/
  config/env.ts               typed, lazy env access (one place)
  pages/                      Page objects encapsulate their selectors and actions (no assertions)
  api/IdentityAdminClient.ts  provider-agnostic interface (create/delete user, MFA, lock, unlock)
  api/StrivacityAdminClient.ts  Strivacity implementation (token cache, retry on 429/5xx)
  api/createAdminClient.ts    factory driven by IDP_PROVIDER
  services/MailService.ts     provider-agnostic mail interface
  services/MailosaurMailService.ts
  services/UserFactory.ts     creates users, guarantees cleanup
  services/AuthFlow.ts        auth.signIn(user): login + the right MFA answer
  utils/totp.ts               flake-proof TOTP generator
  fixtures/index.ts           injects everything into tests
tests/
  setup/api-health.setup.ts   fails fast if API credentials are wrong; UI tests are then skipped
  auth/*.spec.ts              mfa-email-otp, mfa-totp, password-reset, account-lock
```

Rules the structure enforces:
1. Specs never create users or call HTTP directly: they use fixtures (`newUser`, `emailMfaUser`, `totpUser`, `admin`, `mail`).
2. Page objects hold actions and locators; **assertions live in specs**.
3. Each page object owns the selectors and actions for that page. Product knowledge lives only in adapters.
4. Each test owns its user (unique email) so tests can run in parallel and never share state.

## Setup

1. **Admin API client in Strivacity**: create an application client of type *OIDC using no-code components*,
   interactive login disabled; create an API access policy granting `read:account`, `write:account`,
   `delete:account`, `write:account_authenticator`; assign the client to it.
   Docs: https://docs.strivacity.com/reference/getting-started-with-the-admin-api
2. **Mail capture**: a Mailosaur server. Make the tenant's email provider deliver to `*.mailosaur.net`
   addresses in the test environment.
3. **Tenant policies required by the tests**: MFA required for the app (email OTP + TOTP allowed), brute-force
   lockout enabled (`LOCKOUT_THRESHOLD`), a forgot-password journey enabled.
4. ```bash
   npm install
   npm run install:browsers
   cp .env.example .env     # fill in
   npm test
   ```

Commands: `npm run test:smoke`, `npm run test:slow` (real brute-force lockout), `npm run test:ui`, `npm run report`.

## Run in GitHub Actions

The workflow at `../.github/workflows/playwright.yml` type-checks pull requests targeting `main`.
It runs the end-to-end suite on pushes to `main` and on manual runs, then uploads the HTML report
as the `playwright-report` artifact.

Before the first run, add these values under **GitHub repository → Settings → Secrets and variables
→ Actions → New repository secret**:

- `APP_BASE_URL`
- `STRIVACITY_TENANT`
- `STRIVACITY_IDENTITY_STORE`
- `STRIVACITY_CLIENT_ID`
- `STRIVACITY_CLIENT_SECRET`
- `MAILOSAUR_API_KEY`
- `MAILOSAUR_SERVER_ID`

In the repository's **Actions** tab, select **Playwright → Run workflow** to start a manual
end-to-end run. Manual runs use the selected branch, so ensure it includes the workflow file.
Pull requests intentionally run type-checking only; end-to-end tests use credentials and run against
the configured external application on pushes to `main` or manual dispatch.

## Reading emails from Outlook (Microsoft Graph)

Set `MAIL_PROVIDER=outlook` to read a real Outlook / Exchange Online mailbox instead of Mailosaur.

One-time setup:
1. Entra ID -> App registrations -> New registration. Create a client secret.
2. API permissions -> Microsoft Graph -> **Application permissions** -> `Mail.Read` -> grant admin consent.
3. Restrict the app to the QA mailbox only (Exchange Application Access Policy, or RBAC for Applications).
4. Make sure plus-addressing is enabled in Exchange Online, so `qa.mailbox+<unique>@company.com` lands in `qa.mailbox@company.com`.
5. Fill the `OUTLOOK_*` values in `.env`.

How a user id travels from the mailbox to the login field (see `tests/auth/userid-from-email.spec.ts`):
```
trigger email (UI)  ->  mail.waitForText(address, USER_ID_PATTERN)  ->  loginPage.login(userId, password)
```
`waitForText` polls Graph every 2s, accepts only messages addressed to this test's unique alias,
extracts the first capture group of `USER_ID_PATTERN`, and marks the message consumed.

## Registration, then login with the same details

`tests/registration/registration.spec.ts` (STV Demo "Create your credentials" form):

1. Build unique data (`buildRegistrationData()`: `pwreg-*` username, strong password, names, both consents).
2. Register cleanup first (`registrationCleanup.trackUsername`), so the account is deleted even if a step fails.
3. Fill the form and click Continue (`registrationPage.register(data)`).
4. Assert the form is gone and no validation errors show, then accept either outcome: already signed in, or sent to login.
5. Log in with the same username and password in a **fresh browser context** (`freshSession`), so an existing SSO session
   can never log the user in without the credentials.

Set `DEMO_APP_NAV=true` so journeys start from the demo app's top navigation links.
Cleanup is best effort (`findUserId` scans the first page of the accounts list); sweep leftover `pwreg-*` users periodically.

## Adding things

- **New UI element**: add its selector and behavior to the relevant page object.
- **New test user shape**: extend `UserFactory.create()`; expose it as a fixture in `fixtures/index.ts`.
- **Another IdP (Okta, Ping)**: implement `IdentityAdminClient` (same 7 methods), add a `case` in
  `createAdminClient()`, set `IDP_PROVIDER`. Update the relevant page objects for that product's pages. Specs stay unchanged.
- **Another mailbox provider (Mailpit, Graph)**: implement `MailService`, add a `case` in `createMailService()`.
- **Another team's app**: set `APP_BASE_URL`, `LOGIN_START_PATH`, and `POST_LOGIN_URL_PATTERN`; adapt the relevant page objects.

## Flake controls built in

- TOTP codes are never generated in the last 3 seconds of a window and never re-used inside a window.
- Mail is fetched by polling the mail API for a unique per-test address (no fixed sleeps).
- Admin API calls retry on 429/502/503/504 honoring `Retry-After`; tokens are cached.
- Users are deleted in fixture teardown even when a test fails.
- `api-health` project skips the whole UI suite when admin credentials are wrong.
- Retries are limited to 1 on CI so real flakiness is not hidden.

## Verify before relying on it

These were taken from Strivacity's public API reference or are reasonable assumptions; confirm them in your tenant's OpenAPI spec:
- Create-account response: the id is read from `id`, `accountId`, or the `Location` header.
- Lock endpoint body: `{ "type": <STRIVACITY_LOCK_TYPE> }`. Allowed values are not confirmed here.
- Locator values, `totpSecret` element, login layout (`LOGIN_STYLE`), and lock/reset message wording.
- Whether your lockout policy locks on the Nth or N+1th failure.
