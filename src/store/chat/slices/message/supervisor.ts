import { ChatMessage } from '@/types/message';
import { ChatGroupAgentItem } from '@/database/schemas/chatGroup';
import { groupSupervisorPrompts } from '@/prompts/chatMessages';
import { chatService } from '@/services/chat';
import { systemAgentSelectors } from '@/store/user/selectors';
import { useUserStore } from '@/store/user';

export interface SupervisorDecision {
  nextSpeakers: string[]; // agentIds who should respond (empty array = stop)
}

export interface SupervisorContext {
  availableAgents: ChatGroupAgentItem[];
  groupId: string;
  messages: ChatMessage[];
}

/**
 * Core supervisor class that decides who should speak next in group chat
 */
export class GroupChatSupervisor {
  private readonly systemPrompt = `You are a conversation supervisor for a group chat with multiple AI agents. Your role is to decide which agents should respond next based on the conversation context.

Rules:
1. Analyze the conversation history and determine which agents are most relevant to respond
2. You can select 0-3 agents to respond (empty = conversation ends naturally)
3. Consider agent specialties and the current topic
4. Avoid having the same agent respond consecutively unless necessary
5. Ensure balanced participation when possible

Response format: Return ONLY a JSON array of agent IDs, nothing else.
Examples: ["agent1", "agent2"] or [] or ["agent3"]`;

  /**
   * Make decision on who should speak next
   */
  async makeDecision(context: SupervisorContext): Promise<SupervisorDecision> {
    const { messages, availableAgents } = context;

    // If no agents available, stop conversation
    if (availableAgents.length === 0) {
      // return { nextSpeakers: [] };k
    }

    try {
      // Prepare agent descriptions for the supervisor
      const agentDescriptions = this.buildAgentDescriptions(availableAgents);

      // Create supervisor prompt with conversation context
      const conversationHistory = groupSupervisorPrompts(messages);

      const supervisorPrompt = `${this.systemPrompt}

Available agents:
${agentDescriptions}

${conversationHistory}

Which agents should respond next?`;

      const response = await this.callLLMForDecision(supervisorPrompt);

      const decision = this.parseDecision(response, availableAgents);

      return decision;
    } catch (error) {
      console.error('Supervisor decision failed:', error);

      // Fallback: select one random agent if error occurs
      return this.getFallbackDecision(availableAgents, messages);
    }
  }

  /**
   * Build agent description text for supervisor
   */
  private buildAgentDescriptions(agents: ChatGroupAgentItem[]): string {
    return JSON.stringify(agents, null, 2);
  }

  /**
   * Call LLM service to get supervisor decision
   */
  private async callLLMForDecision(prompt: string): Promise<string> {
    const { model, provider } = systemAgentSelectors.groupChatSupervisor(useUserStore.getState());

    const supervisorConfig = {
      // max_tokens: 100,
      model: 'gemini-2.5-flash',
      provider: 'google',
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
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\[.*?]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const agentIds = JSON.parse(jsonMatch[0]) as string[];

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
    const enabledAgents = availableAgents.filter((agent) => agent.enabled);

    if (enabledAgents.length === 0) {
      return { nextSpeakers: [] };
    }

    // Determine last speaker from messages to avoid consecutive responses
    const lastMessage = messages.at(-1);
    const lastSpeakerId = lastMessage?.role === 'user' ? 'user' : lastMessage?.agentId;

    // Avoid consecutive responses from same agent
    const eligibleAgents = enabledAgents.filter((agent) => agent.agentId !== lastSpeakerId);

    const candidateAgents = eligibleAgents.length > 0 ? eligibleAgents : enabledAgents;

    // Select first agent as fallback (could be randomized)
    return { nextSpeakers: [candidateAgents[0].agentId] };
  }

  /**
   * Quick validation of decision against group rules
   */
  validateDecision(decision: SupervisorDecision, context: SupervisorContext): boolean {
    const { nextSpeakers } = decision;
    const { availableAgents } = context;

    // Empty is always valid (means stop)
    if (nextSpeakers.length === 0) return true;

    // Check all speakers are available and enabled
    return nextSpeakers.every((speakerId) =>
      availableAgents.some((agent) => agent.agentId === speakerId && agent.enabled),
    );
  }
} 
