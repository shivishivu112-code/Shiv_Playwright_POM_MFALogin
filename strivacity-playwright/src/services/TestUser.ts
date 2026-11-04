import { TotpGenerator } from '../utils/totp';

export type MfaKind =
  | { type: 'none' }
  | { type: 'email' }
  | { type: 'totp'; totp: TotpGenerator };

export interface TestUser {
  id: string;
  email: string;
  password: string;
  mfa: MfaKind;
}
