import { LobeChatGroupFullConfig, LobeChatGroupChatConfig, LobeChatGroupMetaConfig } from '@/types/chatGroup';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '@/const/settings/llm';

export const DEFAULT_CHAT_GROUP_CHAT_CONFIG: LobeChatGroupChatConfig = {
    maxResponseInRow: 1,
    orchestratorModel: DEFAULT_MODEL,
    orchestratorProvider: DEFAULT_PROVIDER,
    responseOrder: 'natural',
    responseSpeed: 'fast',
    revealDM: false,
};

export const DEFAULT_CHAT_GROUP_META_CONFIG: LobeChatGroupMetaConfig = {
    description: '',
    title: '',
};

export const DEFAULT_CHAT_GROUP_CONFIG: LobeChatGroupFullConfig = {
    chat: DEFAULT_CHAT_GROUP_CHAT_CONFIG,
    meta: DEFAULT_CHAT_GROUP_META_CONFIG,
};