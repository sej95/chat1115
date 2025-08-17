import { ChatMessage } from '@/types/message';
import { ChatGroupAgentItem } from '@/database/schemas/chatGroup';
import { groupSupervisorPrompts } from '@/prompts/chatMessages';
import { chatService } from '@/services/chat';

export interface SupervisorDecision {
  nextSpeakers: string[]; // agentIds who should respond (empty array = stop)
}

export interface SupervisorContext {
  availableAgents: ChatGroupAgentItem[];
  groupId: string;
  messages: ChatMessage[];
  model: string;
  provider: string;
  userName?: string; // Real user name for group member list
}

/**
 * Core supervisor class that decides who should speak next in group chat
 */
export class GroupChatSupervisor {
  private readonly systemPrompt = `You are a conversation supervisor for a group chat with multiple AI agents. Your role is to decide which agents should respond next based on the conversation context.

Rules:
- Always return nextSpeaker as an array of member ids from the GroupMembers list
- If a member's expertise is needed based on the conversation topic, include that member
- If the conversation seems complete, return empty array.
- Your goal is to make the conversation as natural as possible

Response format: Return ONLY an array of agent IDs, nothing else.
Examples: ["agt_01", "agt_02"] or [] or ["agt_03"]`;

  /**
   * Make decision on who should speak next
   */
  async makeDecision(context: SupervisorContext): Promise<SupervisorDecision> {
    const { messages, availableAgents, userName } = context;

    // If no agents available, stop conversation
    if (availableAgents.length === 0) {
      return { nextSpeakers: [] };
    }

    try {
      // Prepare agent descriptions for the supervisor (including user)
      const memberDescriptions = this.buildMemberDescriptions(availableAgents, userName);

      // Create supervisor prompt with conversation context
      const conversationHistory = groupSupervisorPrompts(messages);

      const supervisorPrompt = `${this.systemPrompt}
<group_description>
No group description.
</group_description>

${memberDescriptions}

<conversation_history>
${conversationHistory}
</conversation_history>
`;

      const response = await this.callLLMForDecision(supervisorPrompt, context);

      const decision = this.parseDecision(response, availableAgents);

      return decision;
    } catch (error) {
      console.error('Supervisor decision failed:', error);

      // Fallback: return empty result to stop conversation when error occurs
      return { nextSpeakers: [] };
    }
  }

  /**
   * Build member description text for supervisor using XML format
   */
  private buildMemberDescriptions(agents: ChatGroupAgentItem[], userName?: string): string {
    // Include user as first member
    const members = [
      {
        id: 'user',
        name: userName || 'User',
        role: 'Human participant'
      },
      // Then include all agents
      ...agents.map(agent => ({
        id: agent.id,
        name: agent.title || agent.id,
        role: 'AI Agent'
      }))
    ];

    const memberList = members
      .map(member => `  <member id="${member.id}" name="${member.name}" />`)
      .join('\n');

    return `<group_members>
${memberList}
</group_members>`;
  }

  /**
   * Call LLM service to get supervisor decision
   */
  private async callLLMForDecision(prompt: string, context: SupervisorContext): Promise<string> {
    const supervisorConfig = {
      model: context.model,
      provider: context.provider,
      temperature: 0.3,
    };

    let res = ""

    await chatService.fetchPresetTaskResult({
      onFinish: async (content) => {
        console.log('Supervisor LLM response:', content);
        res = content.trim();
      },
      onLoadingChange: (loading) => {
        // Optional: Could emit loading state if needed for UI feedback
        console.log('Supervisor LLM loading state:', loading);
      },
      params: {
        messages: [{ content: prompt, role: 'user' }],
        stream: false,
        ...supervisorConfig,
      },
    });

    return res;
  }

  /**
   * Parse LLM response into decision
   */
  private parseDecision(
    response: string,
    availableAgents: ChatGroupAgentItem[],
  ): SupervisorDecision {
    try {
      // Extract JSON array from response by locating the first '[' and the last ']'
      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']');
      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error('No JSON array found in response');
      }
      const jsonText = response.slice(startIndex, endIndex + 1);

      const agentIds = JSON.parse(jsonText) as string[];

      // Validate agent IDs exist in available agents
      const validAgentIds = agentIds.filter((id) =>
        availableAgents.some((agent) => agent.id === id),
      );

      return { nextSpeakers: validAgentIds };
    } catch (error) {
      console.error('Failed to parse supervisor decision:', error);
      throw error;
    }
  }

  /**
   * Fallback decision when supervisor fails
   */
  private getFallbackDecision(
    availableAgents: ChatGroupAgentItem[],
    messages: ChatMessage[],
  ): SupervisorDecision {
    // For group chat agents, we assume they are enabled by default
    // since they wouldn't be in the list if they weren't meant to participate
    const enabledAgents = availableAgents.filter((agent) => true); // All agents are considered enabled

    if (enabledAgents.length === 0) {
      return { nextSpeakers: [] };
    }

    // Determine last speaker from messages to avoid consecutive responses
    const lastMessage = messages.at(-1);
    const lastSpeakerId = lastMessage?.role === 'user' ? 'user' : lastMessage?.agentId;

    // Avoid consecutive responses from same agent
    const eligibleAgents = enabledAgents.filter((agent) => agent.id !== lastSpeakerId);

    const candidateAgents = eligibleAgents.length > 0 ? eligibleAgents : enabledAgents;

    // Select first agent as fallback (could be randomized)
    return { nextSpeakers: [candidateAgents[0].id || 'unknown'] };
  }

  /**
   * Quick validation of decision against group rules
   */
  validateDecision(decision: SupervisorDecision, context: SupervisorContext): boolean {
    const { nextSpeakers } = decision;
    const { availableAgents } = context;

    // Empty is always valid (means stop)
    if (nextSpeakers.length === 0) return true;

    // Check all speakers are available (we assume all agents in the list are enabled)
    return nextSpeakers.every((speakerId) =>
      availableAgents.some((agent) => agent.id === speakerId),
    );
  }
} 
