import { ChatMessage } from '@/types/message';

export interface GroupMemberInfo {
    id: string;
    title: string;
}

const buildGroupMembersTag = (members: GroupMemberInfo[]): string => {
    if (!members || members.length === 0) return '';
    return `<group_members>\n${JSON.stringify(members, null, 2)}\n</group_members>`;
};

const buildChatHistoryAuthorTag = (messages: ChatMessage[], members: GroupMemberInfo[]): string => {
    if (!messages || messages.length === 0) return '';

    const idToTitle = new Map(members.map((m) => [m.id, m.title]));

    const authorLines = messages
        .map((message, index) => {
            let author: string;
            if (message.role === 'user') {
                author = idToTitle.get('user') || 'User';
            } else if (message.agentId) {
                author = idToTitle.get(message.agentId) || 'Assistant';
            } else {
                author = 'Assistant';
            }
            return `${index + 1}: ${author}`;
        })
        .join('\n');

    return `<chat_history_author>\n${authorLines}\n</chat_history_author>`;
};

export const buildGroupChatSystemPrompt = ({
    baseSystemRole = '',
    agentId,
    groupMembers,
    messages,
}: {
    agentId: string;
    baseSystemRole?: string;
    groupMembers: GroupMemberInfo[];
    messages: ChatMessage[];
}): string => {
    const membersTag = buildGroupMembersTag(groupMembers);
    const historyTag = buildChatHistoryAuthorTag(messages, groupMembers);

    const prompt = `${baseSystemRole}
You are participating in a group chat in real world. Please follow these guidelines:

Guidelines:
- Stay in character as ${agentId}
- Be concise and natural, behave like a real person
- Engage naturally in the conversation flow
- Be collaborative and build upon others' responses when appropriate
- Keep your responses concise and relevant to the ongoing discussion
- Each message should no more than 100 words

${membersTag}

${historyTag}

Please respond as this agent would, considering the full conversation history provided above. Directly return the message content, no other text. You do not need add author name or anything else.`;

    return prompt.trim();
};

export const groupChatPrompts = {
    buildGroupChatSystemPrompt,
};


