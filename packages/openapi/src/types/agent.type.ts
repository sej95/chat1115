import { z } from 'zod';

import { AgentItem } from '@/database/schemas';
import { LobeAgentChatConfig } from '@lobechat/types';

/**
 * 模型参数接口
 */
export interface ModelParams {
  frequency_penalty: number;
  presence_penalty: number;
  temperature: number;
  top_p: number;
}

/**
 * 创建 Agent 请求参数
 */
export interface CreateAgentRequest {
  avatar?: string;
  chatConfig?: LobeAgentChatConfig;
  description?: string;
  model?: string;
  params?: Record<string, unknown>;
  provider?: string;
  systemRole?: string;
  title: string;
}

/**
 * 更新 Agent 请求参数
 */
export interface UpdateAgentRequest extends CreateAgentRequest {
  id: string;
}

/**
 * 删除 Agent 请求参数
 */
export interface AgentDeleteRequest {
  agentId: string;
  migrateTo?: string;
}

/**
 * Agent-Session 关联操作请求参数
 */
export interface AgentSessionLinkRequest {
  sessionId: string;
}

/**
 * Agent-Session 批量关联操作请求参数
 */
export interface AgentSessionBatchLinkRequest {
  sessionIds: string[];
}

/**
 * 为 Agent 创建 Session 请求参数
 */
export interface CreateSessionForAgentRequest {
  agentId: string;
  avatar?: string;
  backgroundColor?: string;
  description?: string;
  title?: string;
}

/**
 * Agent-Session 关联关系响应类型
 */
export interface AgentSessionRelation {
  agentId: string;
  session: {
    avatar: string | null;
    description: string | null;
    id: string;
    title: string | null;
    updatedAt: Date;
  };
  sessionId: string;
}

/**
 * 批量删除 Agent 请求参数
 */
export interface BatchDeleteAgentsRequest {
  agentIds: string[];
  migrateTo?: string;
}

/**
 * 批量更新 Agent 请求参数
 */
export interface BatchUpdateAgentsRequest {
  agentIds: string[];
  updateData: {
    avatar?: string;
    description?: string;
    model?: string;
    provider?: string;
    systemRole?: string;
  };
}

/**
 * 批量操作结果类型
 */
export interface BatchOperationResult {
  errors?: Array<{
    error: string;
    id: string;
  }>;
  failed: number;
  success: number;
  total: number;
}

/**
 * Agent 列表项类型，包含关联的会话信息
 */
export interface AgentListItem extends AgentItem {
  agentsToSessions?: Array<{
    session: {
      id: string;
      title: string | null;
      updatedAt: Date;
    };
  }>;
}

/**
 * Agent 列表响应类型
 */
export type AgentListResponse = AgentListItem[];

/**
 * Agent 详情响应类型，包含完整的配置信息
 */
export interface AgentDetailResponse extends AgentItem {
  agentsFiles?: Array<{
    file: {
      fileType: string;
      id: string;
      name: string;
      size: number;
    };
  }>;
  agentsKnowledgeBases?: Array<{
    knowledgeBase: {
      description: string | null;
      id: string;
      name: string;
    };
  }>;
  agentsToSessions?: Array<{
    session: {
      avatar: string | null;
      description: string | null;
      id: string;
      title: string | null;
      updatedAt: Date;
    };
  }>;
}

// Zod Schemas for validation
export const CreateAgentRequestSchema = z.object({
  avatar: z.string().nullish(),
  chatConfig: z
    .object({
      autoCreateTopicThreshold: z.number(),
      disableContextCaching: z.boolean().nullish(),
      displayMode: z.enum(['chat', 'docs']).nullish(),
      enableAutoCreateTopic: z.boolean().nullish(),
      enableCompressHistory: z.boolean().nullish(),
      enableHistoryCount: z.boolean().nullish(),
      enableMaxTokens: z.boolean().nullish(),
      enableReasoning: z.boolean().nullish(),
      enableReasoningEffort: z.boolean().nullish(),
      historyCount: z.number().nullish(),
      reasoningBudgetToken: z.number().nullish(),
      reasoningEffort: z.enum(['low', 'medium', 'high']).nullish(),
      searchFCModel: z.string().nullish(),
      searchMode: z.enum(['disabled', 'enabled']).nullish(),
      useModelBuiltinSearch: z.boolean().nullish(),
    })
    .nullish(),
  description: z.string().nullish(),
  model: z.string().nullish(),
  params: z.record(z.unknown()).nullish(),
  provider: z.string().nullish(),
  systemRole: z.string().nullish(),
  title: z.string().min(1, '标题不能为空'),
});

export const UpdateAgentRequestSchema = CreateAgentRequestSchema.extend({
  id: z.string().min(1, 'Agent ID 不能为空'),
});

export const AgentDeleteRequestSchema = z.object({
  agentId: z.string().min(1, 'Agent ID 不能为空'),
  migrateTo: z.string().nullish(),
});

export const AgentIdParamSchema = z.object({
  id: z.string().min(1, 'Agent ID 不能为空'),
});
