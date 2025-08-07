import { describe, it, expect, beforeEach } from 'vitest';
import { ModelCapabilityValidator } from '../ModelCapabilityValidator';
import type { PipelineContext, ChatMessage, ModelCapabilities } from '../../types';

describe('ModelCapabilityValidator', () => {
  let validator: ModelCapabilityValidator;
  let mockContext: PipelineContext;
  let fullCapabilities: ModelCapabilities;

  beforeEach(() => {
    fullCapabilities = {
      supportsVision: true,
      supportsFunctionCall: true,
      supportsReasoning: true,
      supportsSearch: true,
      maxTokens: 4096,
    };

    validator = new ModelCapabilityValidator(fullCapabilities, {
      abortOnUnsupported: false,
      autoFix: false,
    });
    
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
      expect(validator.getConfig().modelCapabilities).toEqual(fullCapabilities);
    });

    it('should initialize with default options', () => {
      const config = validator.getConfig();
      expect(config.options.abortOnUnsupported).toBe(false);
      expect(config.options.autoFix).toBe(false);
    });
  });


  describe('vision content validation', () => {
    it('should pass validation when vision is supported and used', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '请分析这张图片',
          imageList: [{ id: 'img1', url: 'https://example.com/image.jpg' }],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await validator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toEqual([]);
      expect(result.metadata.modelCapabilityValidation?.validated).toBe(true);
    });

    it('should detect vision content issues when not supported', async () => {
      const noVisionCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsVision: false,
      };
      
      const noVisionValidator = new ModelCapabilityValidator(noVisionCapabilities);
      
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: [
            { type: 'text', text: '分析图片' },
            { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
          ],
          createdAt: Date.now(),
        },
        {
          id: 'user2',
          role: 'user',
          content: '文本消息',
          imageList: [{ id: 'img1', url: 'test.jpg' }],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await noVisionValidator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toHaveLength(2);
      expect(result.metadata.modelCapabilityValidation?.issues[0]).toContain('包含图像内容，但模型不支持视觉功能');
    });

    it('should auto-fix vision content when enabled', async () => {
      const noVisionCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsVision: false,
      };
      
      const autoFixValidator = new ModelCapabilityValidator(noVisionCapabilities, {
        autoFix: true,
      });
      
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: [
            { type: 'text', text: '分析图片' },
            { type: 'image_url', image_url: { url: 'test.jpg' } },
          ],
          imageList: [{ id: 'img1', url: 'test2.jpg' }],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await autoFixValidator.process(mockContext);
      
      // Vision content should be removed
      expect(result.messages[0].imageList).toBeUndefined();
      expect(result.messages[0].content).toBe('分析图片');
    });

    it('should simplify content to string when only text remains', async () => {
      const noVisionCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsVision: false,
      };
      
      const autoFixValidator = new ModelCapabilityValidator(noVisionCapabilities, {
        autoFix: true,
      });
      
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: [
            { type: 'text', text: '只有文本内容' },
            { type: 'image_url', image_url: { url: 'test.jpg' } },
          ],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await autoFixValidator.process(mockContext);
      
      expect(result.messages[0].content).toBe('只有文本内容');
    });
  });

  describe('function call validation', () => {
    it('should pass validation when function calls are supported and used', async () => {
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: '我来调用工具',
          tools: [{ id: 'call_123', name: 'weather' }],
          createdAt: Date.now(),
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '{"temperature": 25}',
          tool_call_id: 'call_123',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await validator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toEqual([]);
    });

    it('should detect function call issues when not supported', async () => {
      const noFunctionCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsFunctionCall: false,
      };
      
      const noFunctionValidator = new ModelCapabilityValidator(noFunctionCapabilities);
      
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: '调用工具',
          tools: [{ id: 'call_123' }],
          createdAt: Date.now(),
        },
        {
          id: 'assistant2',
          role: 'assistant',
          content: '另一个工具调用',
          tool_calls: [{ id: 'call_456', function: { name: 'test' } }],
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
      
      mockContext.messages = messages;
      
      const result = await noFunctionValidator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toHaveLength(3);
      expect(result.metadata.modelCapabilityValidation?.issues.some(issue => 
        issue.includes('包含函数调用，但模型不支持函数调用功能')
      )).toBe(true);
    });

    it('should auto-fix function calls when enabled', async () => {
      const noFunctionCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsFunctionCall: false,
      };
      
      const autoFixValidator = new ModelCapabilityValidator(noFunctionCapabilities, {
        autoFix: true,
      });
      
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: '调用工具',
          tools: [{ id: 'call_123' }],
          createdAt: Date.now(),
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '工具响应',
          tool_call_id: 'call_123',
          plugin: { name: 'weather' },
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await autoFixValidator.process(mockContext);
      
      // Function calls should be removed
      expect(result.messages[0].tools).toBeUndefined();
      expect(result.messages[0].tool_calls).toBeUndefined();
      
      // Tool message should be converted to user message
      expect(result.messages[1].role).toBe('user');
      expect(result.messages[1].tool_call_id).toBeUndefined();
      expect(result.messages[1].plugin).toBeUndefined();
    });
  });

  describe('reasoning content validation', () => {
    it('should pass validation when reasoning is supported and used', async () => {
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: '基于推理的回答',
          reasoning: {
            content: '这是推理过程',
            signature: 'reasoning_123',
          },
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await validator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toEqual([]);
    });

    it('should detect reasoning issues when not supported', async () => {
      const noReasoningCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsReasoning: false,
      };
      
      const noReasoningValidator = new ModelCapabilityValidator(noReasoningCapabilities);
      
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: '推理回答',
          reasoning: {
            content: '推理内容',
            signature: 'sig123',
          },
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await noReasoningValidator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toHaveLength(1);
      expect(result.metadata.modelCapabilityValidation?.issues[0]).toContain('包含推理内容，但模型不支持推理功能');
    });

    it('should auto-fix reasoning content when enabled', async () => {
      const noReasoningCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsReasoning: false,
      };
      
      const autoFixValidator = new ModelCapabilityValidator(noReasoningCapabilities, {
        autoFix: true,
      });
      
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: '推理过程', signature: 'sig' },
            { type: 'text', text: '最终答案' },
          ],
          reasoning: {
            content: '推理内容',
            signature: 'sig123',
          },
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await autoFixValidator.process(mockContext);
      
      // Reasoning should be removed
      expect(result.messages[0].reasoning).toBeUndefined();
      expect(result.messages[0].content).toBe('最终答案');
    });
  });

  describe('search functionality validation', () => {
    it('should pass validation when search is supported and used', async () => {
      mockContext.metadata.searchContext = {
        enabled: true,
        mode: 'web',
        query: '测试查询',
      };
      
      const result = await validator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toEqual([]);
    });

    it('should detect search issues when not supported', async () => {
      const noSearchCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsSearch: false,
      };
      
      const noSearchValidator = new ModelCapabilityValidator(noSearchCapabilities);
      
      mockContext.metadata.searchContext = {
        enabled: true,
        mode: 'web',
        query: '测试查询',
      };
      
      const result = await noSearchValidator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues).toHaveLength(1);
      expect(result.metadata.modelCapabilityValidation?.issues[0]).toContain('启用了搜索功能，但模型不支持搜索');
    });

    it('should auto-fix search functionality when enabled', async () => {
      const noSearchCapabilities: ModelCapabilities = {
        ...fullCapabilities,
        supportsSearch: false,
      };
      
      const autoFixValidator = new ModelCapabilityValidator(noSearchCapabilities, {
        autoFix: true,
      });
      
      mockContext.metadata.searchContext = {
        enabled: true,
        mode: 'web',
        query: '测试查询',
      };
      
      const result = await autoFixValidator.process(mockContext);
      
      // Search should be disabled
      expect(result.metadata.searchContext?.enabled).toBe(false);
    });
  });

  describe('abort on unsupported functionality', () => {
    it('should abort when unsupported features are found and abort is enabled', async () => {
      const noCapabilities: ModelCapabilities = {
        supportsVision: false,
        supportsFunctionCall: false,
        supportsReasoning: false,
        supportsSearch: false,
        maxTokens: 4096,
      };
      
      const abortValidator = new ModelCapabilityValidator(noCapabilities, {
        abortOnUnsupported: true,
        autoFix: false,
      });
      
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
          imageList: [{ id: 'img1', url: 'test.jpg' }],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await abortValidator.process(mockContext);
      
      expect(result.executionInfo.errors).toHaveLength(1);
      expect(result.executionInfo.errors[0].message).toContain('模型不支持所需功能');
    });

    it('should not abort when auto-fix is enabled even with abort option', async () => {
      const noCapabilities: ModelCapabilities = {
        supportsVision: false,
        supportsFunctionCall: false,
        supportsReasoning: false,
        supportsSearch: false,
        maxTokens: 4096,
      };
      
      const autoFixValidator = new ModelCapabilityValidator(noCapabilities, {
        abortOnUnsupported: true,
        autoFix: true,
      });
      
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
          imageList: [{ id: 'img1', url: 'test.jpg' }],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await autoFixValidator.process(mockContext);
      
      expect(result.executionInfo.errors).toHaveLength(0);
      expect(result.messages[0].imageList).toBeUndefined();
    });
  });

  describe('configuration methods', () => {
    it('should update model capabilities', () => {
      const newCapabilities: ModelCapabilities = {
        supportsVision: false,
        supportsFunctionCall: true,
        supportsReasoning: false,
        supportsSearch: true,
        maxTokens: 8192,
      };
      
      validator.setModelCapabilities(newCapabilities);
      
      expect(validator.getConfig().modelCapabilities).toEqual(newCapabilities);
    });

    it('should enable auto-fix', () => {
      validator.enableAutoFix();
      
      expect(validator.getConfig().options.autoFix).toBe(true);
    });

    it('should disable auto-fix', () => {
      validator.enableAutoFix();
      validator.disableAutoFix();
      
      expect(validator.getConfig().options.autoFix).toBe(false);
    });

    it('should set abort on unsupported', () => {
      validator.setAbortOnUnsupported(true);
      
      expect(validator.getConfig().options.abortOnUnsupported).toBe(true);
    });

    it('should support method chaining', () => {
      const result = validator
        .enableAutoFix()
        .setAbortOnUnsupported(false);
      
      expect(result).toBe(validator);
      
      const config = validator.getConfig();
      expect(config.options.autoFix).toBe(true);
      expect(config.options.abortOnUnsupported).toBe(false);
    });
  });

  describe('validation details', () => {
    it('should provide detailed validation information', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
          imageList: [{ id: 'img1', url: 'test.jpg' }],
          createdAt: Date.now(),
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '回答',
          tools: [{ id: 'call_123' }],
          reasoning: { content: '推理', signature: 'sig' },
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
      
      mockContext.metadata.searchContext = {
        enabled: true,
        mode: 'web',
      };
      
      mockContext.messages = messages;
      
      const result = await validator.process(mockContext);
      
      const validation = result.metadata.modelCapabilityValidation;
      expect(validation?.validated).toBe(true);
      expect(validation?.capabilities).toEqual(fullCapabilities);
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages array', async () => {
      mockContext.messages = [];
      
      const result = await validator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.validated).toBe(true);
      expect(result.metadata.modelCapabilityValidation?.issues).toEqual([]);
    });

    it('should handle messages without IDs', async () => {
      const messages: any[] = [
        {
          role: 'user',
          content: '无ID消息',
          imageList: [{ id: 'img1', url: 'test.jpg' }],
          createdAt: Date.now(),
        },
      ];
      
      const noVisionValidator = new ModelCapabilityValidator({
        ...fullCapabilities,
        supportsVision: false,
      });
      
      mockContext.messages = messages;
      
      const result = await noVisionValidator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.issues.length).toBeGreaterThan(0);
    });

    it('should handle malformed content arrays', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: [
            null,
            { type: 'text', text: '正常文本' },
            { type: 'image_url' }, // 缺少image_url字段
            { type: 'unknown', data: 'unknown type' },
          ],
          createdAt: Date.now(),
        },
      ];
      
      const noVisionValidator = new ModelCapabilityValidator({
        ...fullCapabilities,
        supportsVision: false,
      }, {
        autoFix: true,
      });
      
      mockContext.messages = messages;
      
      const result = await noVisionValidator.process(mockContext);
      
      // Should handle gracefully
      expect(result.messages[0].content).toBe('正常文本');
    });

    it('should handle messages with mixed capabilities', async () => {
      const partialCapabilities: ModelCapabilities = {
        supportsVision: true,
        supportsFunctionCall: false,
        supportsReasoning: true,
        supportsSearch: false,
        maxTokens: 4096,
      };
      
      const mixedValidator = new ModelCapabilityValidator(partialCapabilities, {
        autoFix: true,
      });
      
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: '复合消息',
          imageList: [{ id: 'img1', url: 'test.jpg' }], // 支持
          tools: [{ id: 'call_123' }], // 不支持
          reasoning: { content: '推理', signature: 'sig' }, // 支持
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await mixedValidator.process(mockContext);
      
      // Should preserve supported features and remove unsupported ones
      expect(result.messages[0].imageList).toBeDefined(); // 保留
      expect(result.messages[0].tools).toBeUndefined(); // 移除
      expect(result.messages[0].reasoning).toBeDefined(); // 保留
    });

    it('should handle undefined metadata gracefully', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试消息',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      mockContext.metadata = undefined as any;
      
      const result = await validator.process(mockContext);
      
      expect(result.metadata.modelCapabilityValidation?.validated).toBe(true);
    });
  });

  describe('comprehensive scenarios', () => {
    it('should handle complex conversation with all feature types', async () => {
      const messages: any[] = [
        {
          id: 'system1',
          role: 'system',
          content: '你是一个多功能助手',
          createdAt: 1000,
        },
        {
          id: 'user1',
          role: 'user',
          content: [
            { type: 'text', text: '分析这张图片并搜索相关信息' },
            { type: 'image_url', image_url: { url: 'test.jpg' } },
          ],
          imageList: [{ id: 'img1', url: 'test2.jpg' }],
          createdAt: 2000,
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '我来分析图片并调用工具搜索',
          tools: [{ id: 'call_search', name: 'search_tool' }],
          reasoning: {
            content: '需要先分析图片内容，然后搜索相关信息',
            signature: 'reasoning_123',
          },
          createdAt: 3000,
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '{"results": ["搜索结果1", "搜索结果2"]}',
          tool_call_id: 'call_search',
          createdAt: 4000,
        },
        {
          id: 'assistant2',
          role: 'assistant',
          content: '基于图片分析和搜索结果，我的回答是...',
          createdAt: 5000,
        },
      ];
      
      mockContext.messages = messages;
      mockContext.metadata.searchContext = {
        enabled: true,
        mode: 'hybrid',
        query: '图片相关搜索',
      };
      
      // Test with limited capabilities
      const limitedCapabilities: ModelCapabilities = {
        supportsVision: false,
        supportsFunctionCall: false,
        supportsReasoning: false,
        supportsSearch: false,
        maxTokens: 4096,
      };
      
      const limitedValidator = new ModelCapabilityValidator(limitedCapabilities, {
        autoFix: true,
      });
      
      const result = await limitedValidator.process(mockContext);
      
      // Check that all unsupported features were removed
      expect(result.messages.every(msg => !msg.imageList)).toBe(true);
      expect(result.messages.every(msg => !msg.tools)).toBe(true);
      expect(result.messages.every(msg => !msg.reasoning)).toBe(true);
      expect(result.messages.every(msg => msg.role !== 'tool')).toBe(true);
      expect(result.metadata.searchContext?.enabled).toBe(false);
      
      // Check that messages were converted appropriately
      const userMessage = result.messages.find(msg => msg.id === 'user1');
      expect(userMessage?.content).toBe('分析这张图片并搜索相关信息');
      
      const toolMessage = result.messages.find(msg => msg.id === 'tool1');
      expect(toolMessage?.role).toBe('user');
    });
  });
});