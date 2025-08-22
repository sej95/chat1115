import { UserStore } from '@/store/user';
import { UserKeyVaults } from '@/types/user/settings';

import { currentSettings } from './settings';

export const keyVaultsSettings = (s: UserStore): UserKeyVaults =>
  currentSettings(s).keyVaults || {};

const getVaultByProvider = (provider: string) => (s: UserStore) =>
  // @ts-ignore
  (keyVaultsSettings(s)[provider] || {}) as any;

const password = (s: UserStore) => keyVaultsSettings(s).password || '';

export const keyVaultsConfigSelectors = {
  getVaultByProvider,

  keyVaultsSettings,

  password,
};
