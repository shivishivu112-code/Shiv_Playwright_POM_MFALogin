export interface WaitOptions {
  /** Ignore emails received before this time (use for "resend" scenarios). */
  since?: Date;
  timeoutMs?: number;
}

/** Contract for reading emails the IdP sends during tests. */
export interface MailService {
  /** Builds a unique, capturable address for a local part. */
  addressFor(localPart: string): string;
  /** Latest numeric code (OTP) sent to the address. */
  waitForOtp(to: string, opts?: WaitOptions): Promise<string>;
  /**
   * Text extracted from the body of the latest email to the address.
   * Returns the first capture group of `pattern` (or the whole match if it has no group).
   * Use it for user ids, reference numbers, temporary codes, etc.
   */
  waitForText(to: string, pattern: RegExp, opts?: WaitOptions): Promise<string>;
  /** First link in the latest email to the address whose URL matches `match`. */
  waitForLink(to: string, match: RegExp, opts?: WaitOptions): Promise<string>;
}
