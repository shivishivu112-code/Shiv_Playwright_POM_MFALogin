import { env } from '../config/env';
import { MailService } from './MailService';
import { MailosaurMailService } from './MailosaurMailService';
import { OutlookMailService } from './OutlookMailService';

export function createMailService(): MailService {
  switch (env.mailProvider) {
    case 'mailosaur':
      return new MailosaurMailService(env.mailosaurApiKey, env.mailosaurServerId);
    case 'outlook':
      return new OutlookMailService({
        tenantId: env.outlookTenantId,
        clientId: env.outlookClientId,
        clientSecret: env.outlookClientSecret,
        mailbox: env.outlookMailbox,
        aliasBase: env.outlookAliasBase,
      });
    // case 'mailpit': return new MailpitMailService(...)
    default:
      throw new Error(`Unsupported MAIL_PROVIDER "${env.mailProvider}". Add an adapter in src/services/.`);
  }
}
