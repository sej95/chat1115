import { LobeAgentConfig } from '@/types/agent';

import { MetaData } from '../meta';
import { SessionGroupId } from './sessionGroup';

export enum LobeSessionType {
  Agent = 'agent',
  Group = 'group',
}

/**
 * Lobe Agent Session
 */
export interface LobeAgentSession {
  config: LobeAgentConfig;
  createdAt: Date;
  group?: SessionGroupId;
  id: string;
  meta: MetaData;
  model: string;
  pinned?: boolean;
  tags?: string[];
  type: LobeSessionType.Agent;
  updatedAt: Date;
}

/**
 * Lobe Group Session - represents group chats
 */
export interface LobeGroupSession {
  createdAt: Date;
  group?: SessionGroupId;
  id: string;
  members?: string[];
  meta: MetaData;
  pinned?: boolean;
  tags?: string[];
  type: LobeSessionType.Group;
  updatedAt: Date;
}

export interface LobeAgentSettings {
  /**
   * 语言模型角色设定
   */
  config: LobeAgentConfig;
  meta: MetaData;
}

// Union type for all session types
export type LobeSession = LobeAgentSession | LobeGroupSession;

export type LobeSessions = LobeSession[];
