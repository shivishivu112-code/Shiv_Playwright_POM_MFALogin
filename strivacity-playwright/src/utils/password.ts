import { randomBytes } from 'node:crypto';

/** Meets typical CIAM policies: upper, lower, digit, symbol, 16+ chars. */
export function strongPassword(): string {
  return `Aa1!${randomBytes(9).toString('base64url')}`;
}

export function uniqueLocalPart(prefix = 'pwtest'): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}
