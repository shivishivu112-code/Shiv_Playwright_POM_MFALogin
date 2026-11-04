import dotenv from 'dotenv';

dotenv.config();

/** Reads a mandatory variable lazily, so `playwright test --list` works without a full .env. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

const optional = (name: string, fallback: string): string => process.env[name] ?? fallback;

export const env = {
  // adapters
  get idpProvider() { return optional('IDP_PROVIDER', 'strivacity'); },
  get mailProvider() { return optional('MAIL_PROVIDER', 'mailosaur'); },

  // app under test
  get appBaseUrl() { return required('APP_BASE_URL'); },
  get registrationStartPath() { return optional('REGISTRATION_START_PATH', '/'); },
  /** true for the STV Demo app: journeys start from the top navigation links (Login / Registration). */
  get useDemoNav() { return optional('DEMO_APP_NAV', 'false') === 'true'; },
  get loginStartPath() { return optional('LOGIN_START_PATH', '/'); },
  get postLoginUrlPattern() { return new RegExp(optional('POST_LOGIN_URL_PATTERN', '.*')); },
  get loginStyle(): 'two-step' | 'single-step' {
    return optional('LOGIN_STYLE', 'two-step') === 'single-step' ? 'single-step' : 'two-step';
  },

  // strivacity
  get strivacityTenant() { return required('STRIVACITY_TENANT'); },
  get strivacityIdentityStore() { return required('STRIVACITY_IDENTITY_STORE'); },
  get strivacityClientId() { return required('STRIVACITY_CLIENT_ID'); },
  get strivacityClientSecret() { return required('STRIVACITY_CLIENT_SECRET'); },
  get strivacityLockType() { return optional('STRIVACITY_LOCK_TYPE', 'password'); },
  get lockoutThreshold() { return Number(optional('LOCKOUT_THRESHOLD', '5')); },

  // outlook (Microsoft Graph, application permission Mail.Read)
  get outlookTenantId() { return required('OUTLOOK_TENANT_ID'); },
  get outlookClientId() { return required('OUTLOOK_CLIENT_ID'); },
  get outlookClientSecret() { return required('OUTLOOK_CLIENT_SECRET'); },
  /** The mailbox the framework reads, e.g. qa.mailbox@yourcompany.com */
  get outlookMailbox() { return required('OUTLOOK_MAILBOX'); },
  /** Optional: base address used to build unique plus-addresses (defaults to the mailbox itself). */
  get outlookAliasBase() { return optional('OUTLOOK_ALIAS_BASE', process.env.OUTLOOK_MAILBOX ?? ''); },

  /** Regex whose FIRST CAPTURE GROUP is the user id inside the email body. */
  get userIdPattern() { return new RegExp(optional('USER_ID_PATTERN', 'User\\s*ID\\s*[:\\-]?\\s*([A-Za-z0-9._@+-]+)'), 'i'); },

  // mail
  get mailosaurApiKey() { return required('MAILOSAUR_API_KEY'); },
  get mailosaurServerId() { return required('MAILOSAUR_SERVER_ID'); },
  get resetLinkPattern() { return new RegExp(optional('RESET_LINK_PATTERN', 'reset|recover|password'), 'i'); },
};
