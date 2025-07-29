import { and, desc, eq, inArray } from 'drizzle-orm';

import { LobeChatDatabase } from '@/database/type';
import {
  ChatGroupAgentItem,
  ChatGroupItem,
  NewChatGroup,
  NewChatGroupAgent,
  chatGroups,
  chatGroupsAgents,
} from '@/database/schemas/chatGroup';

export class ChatGroupModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }
  // ******* Query Methods ******* //

  async findById(id: string): Promise<ChatGroupItem | undefined> {
    const item = await this.db.query.chatGroups.findFirst({
      where: and(eq(chatGroups.id, id), eq(chatGroups.userId, this.userId)),
    });

    return item;
  }

  async query(): Promise<ChatGroupItem[]> {
    return this.db.query.chatGroups.findMany({
      orderBy: [desc(chatGroups.updatedAt)],
      where: eq(chatGroups.userId, this.userId),
    });
  }

  async findGroupWithAgents(groupId: string): Promise<{
    group: ChatGroupItem;
    agents: ChatGroupAgentItem[];
  } | null> {
    const group = await this.findById(groupId);
    if (!group) return null;

    const agents = await this.db.query.chatGroupsAgents.findMany({
      where: eq(chatGroupsAgents.chatGroupId, groupId),
      orderBy: [chatGroupsAgents.order],
    });

    return { group, agents };
  }

  // ******* Create Methods ******* //

  async create(params: Omit<NewChatGroup, 'userId'>): Promise<ChatGroupItem> {
    const [result] = await this.db
      .insert(chatGroups)
      .values({ ...params, userId: this.userId })
      .returning();

    return result;
  }

  async createWithAgents(
    groupParams: Omit<NewChatGroup, 'userId'>,
    agentIds: string[],
  ): Promise<{ group: ChatGroupItem; agents: ChatGroupAgentItem[] }> {
    const group = await this.create(groupParams);

    const agentParams: NewChatGroupAgent[] = agentIds.map((agentId, index) => ({
      chatGroupId: group.id,
      agentId,
      userId: this.userId,
      order: index.toString(),
      enabled: true,
      role: 'participant',
    }));

    const agents = await this.db.insert(chatGroupsAgents).values(agentParams).returning();

    return { group, agents };
  }

  // ******* Update Methods ******* //

  async update(id: string, value: Partial<ChatGroupItem>): Promise<ChatGroupItem> {
    const [result] = await this.db
      .update(chatGroups)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(chatGroups.id, id), eq(chatGroups.userId, this.userId)))
      .returning();

    return result;
  }

  async addAgentToGroup(
    groupId: string,
    agentId: string,
    options?: { order?: string; role?: string },
  ): Promise<ChatGroupAgentItem> {
    const params: NewChatGroupAgent = {
      chatGroupId: groupId,
      agentId,
      userId: this.userId,
      order: options?.order || '0',
      role: options?.role || 'participant',
      enabled: true,
    };

    const [result] = await this.db.insert(chatGroupsAgents).values(params).returning();
    return result;
  }

  async removeAgentFromGroup(groupId: string, agentId: string): Promise<void> {
    await this.db
      .delete(chatGroupsAgents)
      .where(
        and(eq(chatGroupsAgents.chatGroupId, groupId), eq(chatGroupsAgents.agentId, agentId)),
      );
  }

  async updateAgentInGroup(
    groupId: string,
    agentId: string,
    updates: Partial<Pick<ChatGroupAgentItem, 'enabled' | 'order' | 'role'>>,
  ): Promise<ChatGroupAgentItem> {
    const [result] = await this.db
      .update(chatGroupsAgents)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(eq(chatGroupsAgents.chatGroupId, groupId), eq(chatGroupsAgents.agentId, agentId)),
      )
      .returning();

    return result;
  }

  // ******* Delete Methods ******* //

  async delete(id: string): Promise<ChatGroupItem> {
    // Agents are automatically deleted due to CASCADE constraint
    const [result] = await this.db
      .delete(chatGroups)
      .where(and(eq(chatGroups.id, id), eq(chatGroups.userId, this.userId)))
      .returning();

    return result;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(chatGroups).where(eq(chatGroups.userId, this.userId));
  }

  // ******* Agent Query Methods ******* //

  async getGroupAgents(groupId: string): Promise<ChatGroupAgentItem[]> {
    return this.db.query.chatGroupsAgents.findMany({
      where: eq(chatGroupsAgents.chatGroupId, groupId),
      orderBy: [chatGroupsAgents.order],
    });
  }

  async getEnabledGroupAgents(groupId: string): Promise<ChatGroupAgentItem[]> {
    return this.db.query.chatGroupsAgents.findMany({
      where: and(eq(chatGroupsAgents.chatGroupId, groupId), eq(chatGroupsAgents.enabled, true)),
      orderBy: [chatGroupsAgents.order],
    });
  }

  async getGroupsWithAgents(agentIds?: string[]): Promise<ChatGroupItem[]> {
    if (!agentIds || agentIds.length === 0) {
      return this.query();
    }

    // Find groups containing any of the specified agents
    const groupIds = await this.db
      .selectDistinct({ chatGroupId: chatGroupsAgents.chatGroupId })
      .from(chatGroupsAgents)
      .where(
        and(eq(chatGroupsAgents.userId, this.userId), inArray(chatGroupsAgents.agentId, agentIds)),
      );

    if (groupIds.length === 0) return [];

    return this.db.query.chatGroups.findMany({
      where: and(
        inArray(
          chatGroups.id,
          groupIds.map((g) => g.chatGroupId),
        ),
        eq(chatGroups.userId, this.userId),
      ),
      orderBy: [desc(chatGroups.updatedAt)],
    });
  }
} 
