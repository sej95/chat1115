import { DEFAULT_CHAT_GROUP_CHAT_CONFIG, DEFAULT_CHAT_GROUP_CONFIG, DEFAULT_CHAT_GROUP_META_CONFIG } from '@/const/settings';
import { merge } from '@/utils/merge';

import { State } from './initialState';

const chatGroupConfig = (s: State) => merge(DEFAULT_CHAT_GROUP_CONFIG, s.config);

const currentChatConfig = (s: State) => merge(DEFAULT_CHAT_GROUP_CHAT_CONFIG, s.config);

const currentMetaConfig = (s: State) => merge(DEFAULT_CHAT_GROUP_META_CONFIG, s.meta);

export const selectors = {
  chatGroupConfig,
  currentChatConfig,
  currentMetaConfig,
};