import { test as setup } from '../../src/fixtures';

setup('admin API is reachable and credentials are valid', async ({ admin }) => {
  await admin.ping();
});
