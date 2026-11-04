/**
 * SINGLE SOURCE OF TRUTH FOR EVERY UI LOCATOR.
 * ------------------------------------------------------------------
 * The hosted login pages of a COTS IdP (Strivacity, Okta, Ping...) are the only part of this framework that
 * is product- and theme-specific. Keep ALL of it here. To point the framework at another product or tenant
 * theme, you should only need to edit this file.
 *
 * Entry format:   name: { type: '<kind>', value: '<selector>' }
 *
 * Types: css | xpath | testId | role | text | label | placeholder | altText | title
 *   role example   { type: 'role', value: 'button', name: /continue|next/i }
 *   dynamic values use {param} placeholders:  { type: 'css', value: 'tr[data-id="{id}"]' }
 *
 * PREFER role / label / text locators on COTS pages: you do not control their markup, but you can
 * rely on accessible names. Use css/xpath only when nothing accessible exists.
 *
 * >>> Every selector below is a PLACEHOLDER. Inspect your tenant's pages and adjust. <<<
 */
import { Page } from '@playwright/test';

type Role = Parameters<Page['getByRole']>[0];

export type LocatorDef =
  | { type: 'css'; value: string; nth?: number }
  | { type: 'xpath'; value: string; nth?: number }
  | { type: 'testId'; value: string; nth?: number }
  | { type: 'role'; value: Role; name?: string | RegExp; exact?: boolean; nth?: number }
  | { type: 'text'; value: string | RegExp; exact?: boolean; nth?: number }
  | { type: 'label'; value: string | RegExp; exact?: boolean; nth?: number }
  | { type: 'placeholder'; value: string | RegExp; exact?: boolean; nth?: number }
  | { type: 'altText'; value: string | RegExp; exact?: boolean; nth?: number }
  | { type: 'title'; value: string | RegExp; exact?: boolean; nth?: number };

export const locators = {
  // ================= STV Demo app: top navigation =================
  nav: {
    login:        { type: 'role', value: 'link', name: 'Login', exact: true },
    registration: { type: 'role', value: 'link', name: 'Registration', exact: true },
  },

  // ================= Registration journey ("Create your credentials") =================
  registration: {
    heading:                 { type: 'role', value: 'heading', name: /create your credentials/i },
    username:                { type: 'label', value: /^username/i },
    password:                { type: 'label', value: /^password/i },            // "Password *"
    retypePassword:          { type: 'label', value: /re-?type password/i },    // "Re-type password *"
    givenName:               { type: 'label', value: /given name/i },
    familyName:              { type: 'label', value: /family name/i },
    esignConsent:            { type: 'role', value: 'checkbox', name: /ESign Consent|Consent to Receive Information Electronically/i },
    digitalServicesAgreement:{ type: 'role', value: 'checkbox', name: /Digital Services Agreement/i },
    continueButton:          { type: 'role', value: 'button', name: /^continue$/i },
    backToLogin:             { type: 'role', value: 'link', name: /back to login/i },
    validationErrors:        { type: 'css', value: '[aria-invalid="true"], [role="alert"]' },
  },

  // ================= Login journey =================
  login: {
    identifier:     { type: 'role', value: 'textbox', name: /email|username|identifier/i },
    password:       { type: 'label', value: /^password$/i },
    continueButton: { type: 'role', value: 'button', name: /continue|next|log in|sign in/i },
    forgotPassword: { type: 'role', value: 'link', name: /forgot/i },
    forgotUserId:   { type: 'role', value: 'link', name: /forgot (your )?(user ?(id|name)|id)/i },
    errorMessage:   { type: 'role', value: 'alert' },
    lockedMessage:  { type: 'text', value: /locked|too many (failed )?attempts/i },
  },

  // ================= MFA (OTP code entry + TOTP enrollment) =================
  mfa: {
    codeInput:        { type: 'role', value: 'textbox', name: /code/i },
    verifyButton:     { type: 'role', value: 'button', name: /verify|continue|submit/i },
    resend:           { type: 'role', value: 'button', name: /resend/i },
    errorMessage:     { type: 'role', value: 'alert' },
    // enrollment screens (first login of a user with no authenticator)
    chooseTotp:       { type: 'role', value: 'button', name: /authenticator app|totp/i },
    manualEntry:      { type: 'role', value: 'button', name: /can.?t scan|enter .*manually|manual/i },
    totpSecret:       { type: 'css', value: '[data-testid="totp-secret"]' }, // REPLACE with real element
  },

  // ================= Forgot password =================
  forgotPassword: {
    identifier:   { type: 'role', value: 'textbox', name: /email|username/i },
    submit:       { type: 'role', value: 'button', name: /send|continue|reset|submit/i },
    confirmation: { type: 'text', value: /check your (e-?mail|inbox)|we('ve| have) sent|instructions/i },
  },

  // ================= Forgot user ID =================
  forgotUserId: {
    email:        { type: 'role', value: 'textbox', name: /email/i },
    submit:       { type: 'role', value: 'button', name: /send|continue|submit/i },
    confirmation: { type: 'text', value: /check your (e-?mail|inbox)|we('ve| have) sent|instructions/i },
  },

  // ================= Reset password (page opened from the email link) =================
  resetPassword: {
    newPassword:     { type: 'label', value: /^new password/i },
    confirmPassword: { type: 'label', value: /confirm/i },
    submit:          { type: 'role', value: 'button', name: /reset|save|change|continue|submit/i },
    success:         { type: 'text', value: /password (has been |was )?(reset|changed|updated)|successfully/i },
    errorMessage:    { type: 'role', value: 'alert' },
    invalidLink:     { type: 'text', value: /invalid|expired|no longer valid/i },
  },

  // ================= The application after login =================
  app: {
    signedInMarker: { type: 'testId', value: 'user-menu' },   // REPLACE: anything only visible when signed in
    signOut:        { type: 'role', value: 'button', name: /sign out|log out/i },
    configWarning:  { type: 'text', value: /configuration unavailable/i },   // shown in the demo header when the BFF is down
  },
} satisfies Record<string, Record<string, LocatorDef>>;
