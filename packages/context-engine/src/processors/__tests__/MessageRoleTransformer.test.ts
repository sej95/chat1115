import { describe, it, expect, beforeEach } from 'vitest';
import { MessageRoleTransformer, type OpenAIChatMessage } from '../MessageRoleTransformer';
import type { PipelineContext, ChatMessage, ModelCapabilities } from '../../types';

describe('MessageRoleTransformer', () => {
  let transformer: MessageRoleTransformer;
  let mockContext: PipelineContext;
  let mockCapabilities: ModelCapabilities;

  beforeEach(() => {
    mockCapabilities = {
      supportsVision: true,
      supportsFunctionCall: true,
      maxTokens: 4096,
    };
    
    transformer = new MessageRoleTransformer(mockCapabilities);
    
    mockContext = {
      messages: [],
      metadata: {},
      initialState: {
        messages: [],
        agent: {},
        session: { id: 'test-session' },
      },
      executionInfo: {
        executedProcessors: [],
        totalExecutionTime: 0,
        errors: [],
      },
    };
  });

  describe('constructor and configuration', () => {
    it('should initialize with model capabilities', () => {
      expect(transformer.getModelCapabilities()).toEqual(mockCapabilities);
    });

    it('should update model capabilities', () => {
      const newCapabilities: ModelCapabilities = {
        supportsVision: false,
        supportsFunctionCall: false,
        maxTokens: 2048,
      };
      
      transformer.setModelCapabilities(newCapabilities);
      
      expect(transformer.getModelCapabilities()).toEqual(newCapabilities);
    });
  });


  describe('system message transformation', () => {
    it('should transform system messages correctly', async () => {
      const systemMessage: ChatMessage = {
        id: 'sys1',
        role: 'system',
        content: '你是一个有用的助手',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [systemMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'system',
        content: '你是一个有用的助手',
      });
    });
  });

  describe('user message transformation', () => {
    it('should transform simple text user messages', async () => {
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '你好，请帮我解决一个问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: '你好，请帮我解决一个问题',
      });
    });

    it('should transform user messages with images to multimodal format', async () => {
      const userMessageWithImages: any = {
        id: 'user1',
        role: 'user',
        content: '请分析这张图片',
        imageList: [
          { id: 'img1', url: 'https://example.com/image1.jpg' },
          { id: 'img2', url: 'https://example.com/image2.png' },
        ],
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessageWithImages];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张图片' },
          { type: 'image_url', image_url: { url: 'https://example.com/image1.jpg', detail: 'auto' } },
          { type: 'image_url', image_url: { url: 'https://example.com/image2.png', detail: 'auto' } },
        ],
      });
    });

    it('should transform user messages with only images (no text)', async () => {
      const userMessageOnlyImages: any = {
        id: 'user1',
        role: 'user',
        content: '',
        imageList: [
          { id: 'img1', url: 'https://example.com/image.jpg' },
        ],
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessageOnlyImages];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'https://example.com/image.jpg', detail: 'auto' } },
        ],
      });
    });

    it('should skip images when vision is not supported', async () => {
      transformer.setModelCapabilities({
        ...mockCapabilities,
        supportsVision: false,
      });
      
      const userMessageWithImages: any = {
        id: 'user1',
        role: 'user',
        content: '请分析这张图片',
        imageList: [{ id: 'img1', url: 'https://example.com/image.jpg' }],
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessageWithImages];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张图片' },
        ],
      });
    });
  });

  describe('assistant message transformation', () => {
    it('should transform simple assistant messages', async () => {
      const assistantMessage: ChatMessage = {
        id: 'assistant1',
        role: 'assistant',
        content: '我很乐意帮助你解决问题。',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [assistantMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'assistant',
        content: '我很乐意帮助你解决问题。',
      });
    });

    it('should transform assistant messages with tool calls', async () => {
      const assistantMessageWithTools: any = {
        id: 'assistant1',
        role: 'assistant',
        content: '我需要使用工具来帮助你',
        tools: [
          {
            id: 'call_123',
            identifier: 'weather',
            apiName: 'getCurrentWeather',
            arguments: '{"city": "北京"}',
          },
          {
            id: 'call_456',
            identifier: 'calculator',
            apiName: 'calculate',
            arguments: '{"expression": "2+2"}',
          },
        ],
        createdAt: Date.now(),
      };
      
      mockContext.messages = [assistantMessageWithTools];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'assistant',
        content: '我需要使用工具来帮助你',
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'weather__getCurrentWeather',
              arguments: '{"city": "北京"}',
            },
          },
          {
            id: 'call_456',
            type: 'function',
            function: {
              name: 'calculator__calculate',
              arguments: '{"expression": "2+2"}',
            },
          },
        ],
      });
    });

    it('should handle assistant messages with reasoning content', async () => {
      const assistantMessageWithReasoning: any = {
        id: 'assistant1',
        role: 'assistant',
        content: '根据分析，答案是...',
        reasoning: {
          content: '首先我需要分析这个问题...',
          signature: 'reasoning_signature_123',
        },
        createdAt: Date.now(),
      };
      
      mockContext.messages = [assistantMessageWithReasoning];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'assistant',
        content: [
          {
            type: 'thinking',
            thinking: '首先我需要分析这个问题...',
            signature: 'reasoning_signature_123',
          },
          {
            type: 'text',
            text: '根据分析，答案是...',
          },
        ],
      });
    });

    it('should handle assistant messages with images', async () => {
      const assistantMessageWithImages: any = {
        id: 'assistant1',
        role: 'assistant',
        content: '这是我生成的图片',
        imageList: [
          { id: 'img1', url: 'https://example.com/generated.jpg' },
        ],
        createdAt: Date.now(),
      };
      
      mockContext.messages = [assistantMessageWithImages];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '这是我生成的图片',
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/generated.jpg',
              detail: 'auto',
            },
          },
        ],
      });
    });

    it('should skip tool calls when not supported', async () => {
      transformer.setModelCapabilities({
        ...mockCapabilities,
        supportsFunctionCall: false,
      });
      
      const assistantMessageWithTools: any = {
        id: 'assistant1',
        role: 'assistant',
        content: '我需要使用工具',
        tools: [
          {
            id: 'call_123',
            identifier: 'weather',
            apiName: 'getCurrentWeather',
            arguments: '{"city": "北京"}',
          },
        ],
        createdAt: Date.now(),
      };
      
      mockContext.messages = [assistantMessageWithTools];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'assistant',
        content: '我需要使用工具',
      });
      
      expect(result.messages[0]).not.toHaveProperty('tool_calls');
    });
  });

  describe('tool message transformation', () => {
    it('should transform tool messages when tools are supported', async () => {
      const toolMessage: any = {
        id: 'tool1',
        role: 'tool',
        content: '{"temperature": 25, "condition": "sunny"}',
        tool_call_id: 'call_123',
        plugin: {
          identifier: 'weather',
          apiName: 'getCurrentWeather',
        },
        createdAt: Date.now(),
      };
      
      mockContext.messages = [toolMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'tool',
        content: '{"temperature": 25, "condition": "sunny"}',
        tool_call_id: 'call_123',
        name: 'weather__getCurrentWeather',
      });
    });

    it('should convert tool messages to user messages when tools are not supported', async () => {
      transformer.setModelCapabilities({
        ...mockCapabilities,
        supportsFunctionCall: false,
      });
      
      const toolMessage: any = {
        id: 'tool1',
        role: 'tool',
        content: '工具返回的结果',
        tool_call_id: 'call_123',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [toolMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: '工具返回的结果',
      });
    });

    it('should handle tool messages without plugin info', async () => {
      const toolMessage: any = {
        id: 'tool1',
        role: 'tool',
        content: '工具结果',
        tool_call_id: 'call_123',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [toolMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0]).toEqual({
        role: 'tool',
        content: '工具结果',
        tool_call_id: 'call_123',
        name: undefined,
      });
    });
  });

  describe('tool name generation', () => {
    it('should generate tool names from various tool properties', async () => {
      const toolConfigurations = [
        {
          identifier: 'weather',
          apiName: 'getCurrentWeather',
          expectedName: 'weather__getCurrentWeather',
        },
        {
          identifier: 'calculator',
          type: 'builtin',
          expectedName: 'calculator',
        },
        {
          identifier: 'custom',
          type: 'plugin',
          expectedName: 'custom__plugin',
        },
        {
          apiName: 'someAPI',
          expectedName: 'someAPI',
        },
        {
          type: 'external',
          expectedName: 'external',
        },
      ];
      
      for (const config of toolConfigurations) {
        const assistantMessage: any = {
          id: 'assistant1',
          role: 'assistant',
          content: '使用工具',
          tools: [{ id: 'call_123', ...config }],
          createdAt: Date.now(),
        };
        
        mockContext.messages = [assistantMessage];
        
        const result = await transformer.process(mockContext);
        const transformed = result.messages[0] as OpenAIChatMessage;
        
        expect(transformed.tool_calls?.[0].function.name).toBe(config.expectedName);
      }
    });

    it('should handle tools with no identifiable information', async () => {
      const assistantMessage: any = {
        id: 'assistant1',
        role: 'assistant',
        content: '使用未知工具',
        tools: [{ id: 'call_123' }], // 没有识别信息
        createdAt: Date.now(),
      };
      
      mockContext.messages = [assistantMessage];
      
      const result = await transformer.process(mockContext);
      const transformed = result.messages[0] as OpenAIChatMessage;
      
      expect(transformed.tool_calls?.[0].function.name).toBe('unknown_tool');
    });
  });

  describe('message validation', () => {
    it('should validate valid messages', () => {
      const validMessages: OpenAIChatMessage[] = [
        { role: 'user', content: '用户消息' },
        { role: 'assistant', content: '助手消息' },
        { role: 'system', content: '系统消息' },
        {
          role: 'tool',
          content: '工具结果',
          tool_call_id: 'call_123',
          name: 'weather__getCurrentWeather',
        },
        {
          role: 'assistant',
          content: '带工具调用的消息',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'test_tool', arguments: '{}' },
            },
          ],
        },
      ];
      
      validMessages.forEach(message => {
        const validation = transformer.validateTransformedMessage(message);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toEqual([]);
      });
    });

    it('should detect invalid messages', () => {
      const invalidMessages: any[] = [
        { content: '缺少角色' }, // 没有role
        { role: 'user' }, // 没有content
        { role: 'tool', content: '缺少tool_call_id' }, // tool消息缺少tool_call_id
        {
          role: 'assistant',
          content: '无效工具调用',
          tool_calls: [{ type: 'function', function: {} }], // 缺少id和name
        },
      ];
      
      invalidMessages.forEach(message => {
        const validation = transformer.validateTransformedMessage(message);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('metadata updates', () => {
    it('should update transformation metadata correctly', async () => {
      const messages: ChatMessage[] = [
        { id: 'sys1', role: 'system', content: '系统', createdAt: Date.now() },
        { id: 'user1', role: 'user', content: '用户', createdAt: Date.now() },
        { id: 'assistant1', role: 'assistant', content: '助手', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await transformer.process(mockContext);
      
      expect(result.metadata.messageTransformation).toEqual({
        originalCount: 3,
        transformedCount: 3,
        supportsFunctionCall: true,
        supportsVision: true,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages array', async () => {
      mockContext.messages = [];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages).toEqual([]);
      expect(result.metadata.messageTransformation?.transformedCount).toBe(0);
    });

    it('should handle messages with null/undefined content', async () => {
      const messagesWithNullContent: any[] = [
        { id: 'msg1', role: 'user', content: null, createdAt: Date.now() },
        { id: 'msg2', role: 'assistant', content: undefined, createdAt: Date.now() },
        { id: 'msg3', role: 'system', content: '', createdAt: Date.now() },
      ];
      
      mockContext.messages = messagesWithNullContent;
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].content).toBe(null);
      expect(result.messages[1].content).toBe(undefined);
      expect(result.messages[2].content).toBe('');
    });

    it('should handle very long message content', async () => {
      const longContent = 'A'.repeat(100000);
      const longMessage: ChatMessage = {
        id: 'long1',
        role: 'user',
        content: longContent,
        createdAt: Date.now(),
      };
      
      mockContext.messages = [longMessage];
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages[0].content).toBe(longContent);
    });

    it('should handle mixed message types in single transformation', async () => {
      const mixedMessages: any[] = [
        { id: 'sys1', role: 'system', content: '系统消息', createdAt: Date.now() },
        {
          id: 'user1',
          role: 'user',
          content: '用户消息带图片',
          imageList: [{ id: 'img1', url: 'https://example.com/img.jpg' }],
          createdAt: Date.now(),
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '助手消息带工具',
          tools: [{ id: 'call_123', identifier: 'test', arguments: '{}' }],
          createdAt: Date.now(),
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '工具响应',
          tool_call_id: 'call_123',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = mixedMessages;
      
      const result = await transformer.process(mockContext);
      
      expect(result.messages).toHaveLength(4);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].role).toBe('user');
      expect(Array.isArray(result.messages[1].content)).toBe(true);
      expect(result.messages[2].role).toBe('assistant');
      expect(result.messages[2]).toHaveProperty('tool_calls');
      expect(result.messages[3].role).toBe('tool');
    });
  });
});