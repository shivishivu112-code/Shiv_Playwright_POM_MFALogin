import * as OTPAuth from 'otpauth';

const PERIOD_SECONDS = 30;
const MIN_REMAINING_SECONDS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generates TOTP codes that will not flake.
 * Two classic TOTP flake sources are handled:
 *  1. A code generated right before the 30s window ends expires while the browser types it.
 *  2. IdPs reject re-use of a code within the same window (replay protection), so two logins
 *     with the same secret inside 30s would fail the second time.
 */
export class TotpGenerator {
  private readonly totp: OTPAuth.TOTP;
  private lastStepUsed = -1;

  constructor(base32Secret: string) {
    const clean = base32Secret.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z2-7]+=*$/.test(clean)) {
      throw new Error('TOTP secret is not valid base32. Check the locator for the enrollment secret.');
    }
    this.totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(clean),
      digits: 6,
      period: PERIOD_SECONDS,
      algorithm: 'SHA1',
    });
  }

  /** Returns a code that is valid for at least a few more seconds and was not used before. */
  async next(): Promise<string> {
    for (;;) {
      const nowSeconds = Date.now() / 1000;
      const step = Math.floor(nowSeconds / PERIOD_SECONDS);
      const remaining = PERIOD_SECONDS - (nowSeconds % PERIOD_SECONDS);

      if (remaining < MIN_REMAINING_SECONDS || step === this.lastStepUsed) {
        await sleep((remaining + 0.3) * 1000); // wait for the next window
        continue;
      }
      this.lastStepUsed = step;
      return this.totp.generate({ timestamp: Date.now() });
    }
  }
}
