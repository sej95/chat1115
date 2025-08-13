import { describe, expect, it } from 'vitest';

import { ChatGroupAgentItem } from '@/database/schemas/chatGroup';

import { GroupChatSupervisor } from './supervisor';

const makeAgent = (agentId: string, enabled: boolean = true): ChatGroupAgentItem => ({
  accessedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'u1',
  chatGroupId: 'g1',
  agentId,
  enabled,
  order: '0',
  role: 'participant',
});

describe('GroupChatSupervisor.parseDecision', () => {
  const supervisor = new GroupChatSupervisor();
  const availableAgents: ChatGroupAgentItem[] = [makeAgent('agt_01'), makeAgent('agt_02')];

  it('should parse JSON array wrapped in code fences', () => {
    const response = '```json\n["agt_01","agt_99"]\n```';
    const result = supervisor['parseDecision'](response, availableAgents);
    expect(result.nextSpeakers).toEqual(['agt_01']);
  });

  it('should parse object with nextSpeakers key', () => {
    const response = '{"nextSpeakers":["agt_02"]}';
    const result = supervisor['parseDecision'](response, availableAgents);
    expect(result.nextSpeakers).toEqual(['agt_02']);
  });

  it('should parse speakers from object under different keys', () => {
    const response = '{"speakers":["agt_01","agt_02"]}';
    const result = supervisor['parseDecision'](response, availableAgents);
    expect(result.nextSpeakers).toEqual(['agt_01', 'agt_02']);
  });

  it('should extract first JSON array in noisy text', () => {
    const response = 'some preface text\n["agt_02"]\ntrailing notes';
    const result = supervisor['parseDecision'](response, availableAgents);
    expect(result.nextSpeakers).toEqual(['agt_02']);
  });

  it('should fall back to matching agentIds present in text when no JSON found', () => {
    const response = 'I think agt_01 should respond next.';
    const result = supervisor['parseDecision'](response, availableAgents);
    expect(result.nextSpeakers).toEqual(['agt_01']);
  });
});


