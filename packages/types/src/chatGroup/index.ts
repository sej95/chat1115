export interface LobeChatGroupMetaConfig {
    description: string;
    title: string;
}

export interface LobeChatGroupChatConfig {
    maxResponseInRow: number;
    orchestratorModel: string;
    orchestratorProvider: string;
    responseOrder: 'sequential' | 'natural';
    responseSpeed: 'fast' | 'medium' | 'slow';
}

export interface LobeChatGroupConfig {
    chat: LobeChatGroupChatConfig;
    meta: LobeChatGroupMetaConfig;
}