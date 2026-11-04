import { randomBytes } from 'node:crypto';
import { strongPassword } from './password';

export interface RegistrationData {
  //username, password, givenName, and familyName are required strings.
  username: string;
  password: string;
  /** Defaults to `password`. Set a different value to test mismatches. ?is optional */
  retypePassword?: string;
  givenName: string;
  familyName: string;
  /** Defaults to true. */
  acceptEsign?: boolean;
  /** Defaults to true. */
  acceptDigitalServices?: boolean;
}

/** Unique, parallel-safe registration data. The `pwreg-` prefix makes leftovers easy to sweep. */
export function buildRegistrationData(overrides: Partial<RegistrationData> = {}): RegistrationData {
  const suffix = randomBytes(4).toString('hex');
  const password = strongPassword();
  return {
    username: `pwreg-${Date.now().toString(36)}-${suffix}`,
    password,
    givenName: 'Playwright',
    familyName: `Tester${suffix}`,
    ...overrides,
  };
}
