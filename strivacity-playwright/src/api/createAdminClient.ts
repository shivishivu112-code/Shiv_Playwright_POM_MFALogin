import { env } from '../config/env';
import { IdentityAdminClient } from './IdentityAdminClient';
import { StrivacityAdminClient } from './StrivacityAdminClient';

/** Factory: the only place that knows which IdP adapter is active (IDP_PROVIDER). */
export function createAdminClient(): IdentityAdminClient {
  switch (env.idpProvider) {
    case 'strivacity':
      return new StrivacityAdminClient({
        tenant: env.strivacityTenant,
        identityStore: env.strivacityIdentityStore,
        clientId: env.strivacityClientId,
        clientSecret: env.strivacityClientSecret,
        lockType: env.strivacityLockType,
      });
    // case 'okta': return new OktaAdminClient(...)
    // case 'ping': return new PingAdminClient(...)
    default:
      throw new Error(`Unsupported IDP_PROVIDER "${env.idpProvider}". Add an adapter in src/api/.`);
  }
}
