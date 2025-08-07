import { describe, it, expect, beforeEach } from 'vitest';
import { InputTemplateInjector } from '../InputTemplateInjector';
import type { PipelineContext, ChatMessage } from '../../types';

describe('InputTemplateInjector', () => {
  let injector: InputTemplateInjector;
  let mockContext: PipelineContext;

  beforeEach(() => {
    injector = new InputTemplateInjector();
    
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
    it('should initialize without template', () => {
      expect(injector.getInputTemplate()).toBeUndefined();
      expect(injector.hasTemplate()).toBe(false);
    });

    it('should initialize with provided template', () => {
      const template = '请回答：{{ text }}';
      const templateInjector = new InputTemplateInjector(template);
      
      expect(templateInjector.getInputTemplate()).toBe(template);
      expect(templateInjector.hasTemplate()).toBe(true);
    });
  });


  describe('doProcess method', () => {
    it('should return context unchanged when no template configured', async () => {
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '原始用户消息',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('原始用户消息');
      expect(result.executionInfo.executedProcessors).toContain('InputTemplateInjector');
    });

    it('should apply template to user messages only', async () => {
      injector.setInputTemplate('问题：{{ text }}');
      
      const messages: ChatMessage[] = [
        { id: 'sys1', role: 'system', content: '系统消息', createdAt: Date.now() },
        { id: 'user1', role: 'user', content: '用户问题', createdAt: Date.now() },
        { id: 'assistant1', role: 'assistant', content: '助手回复', createdAt: Date.now() },
        { id: 'user2', role: 'user', content: '另一个问题', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(4);
      expect(result.messages[0].content).toBe('系统消息'); // 系统消息不变
      expect(result.messages[1].content).toBe('问题：用户问题'); // 用户消息被转换
      expect(result.messages[2].content).toBe('助手回复'); // 助手消息不变
      expect(result.messages[3].content).toBe('问题：另一个问题'); // 用户消息被转换
      
      expect(result.metadata.inputTemplateApplied).toBe(2);
      expect(result.metadata.inputTemplateErrors).toBe(0);
    });

    it('should not modify messages when template produces same content', async () => {
      injector.setInputTemplate('{{ text }}'); // 模板不改变内容
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '测试内容',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('测试内容');
      expect(result.metadata.inputTemplateApplied).toBe(0);
    });

    it('should handle template compilation errors gracefully', async () => {
      injector.setInputTemplate('无效模板 {{ invalid syntax');
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '测试内容',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('测试内容'); // 内容不变
      expect(result.metadata.inputTemplateErrors).toBe(1);
      expect(result.metadata.inputTemplateError).toBeDefined();
    });

    it('should update metadata correctly', async () => {
      injector.setInputTemplate('请详细回答：{{ text }}');
      
      const messages: ChatMessage[] = [
        { id: 'user1', role: 'user', content: '问题1', createdAt: Date.now() },
        { id: 'user2', role: 'user', content: '问题2', createdAt: Date.now() },
        { id: 'user3', role: 'user', content: '问题3', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      expect(result.metadata.inputTemplateApplied).toBe(3);
      expect(result.metadata.inputTemplateErrors).toBe(0);
      expect(result.metadata.inputTemplate).toBe('请详细回答：{{ text }}');
    });
  });

  describe('template configuration methods', () => {
    it('should set and get input template', () => {
      const template = '请回答以下问题：{{ text }}';
      
      injector.setInputTemplate(template);
      
      expect(injector.getInputTemplate()).toBe(template);
      expect(injector.hasTemplate()).toBe(true);
    });

    it('should clear input template', () => {
      injector.setInputTemplate('测试模板：{{ text }}');
      expect(injector.hasTemplate()).toBe(true);
      
      injector.clearInputTemplate();
      
      expect(injector.getInputTemplate()).toBeUndefined();
      expect(injector.hasTemplate()).toBe(false);
    });

    it('should validate template correctly', () => {
      // 有效模板
      injector.setInputTemplate('{{ text }}');
      expect(injector.validateTemplate()).toEqual({ valid: true });
      
      // 无效模板
      injector.setInputTemplate('{{ invalid');
      const validation = injector.validateTemplate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      
      // 空模板
      injector.clearInputTemplate();
      expect(injector.validateTemplate()).toEqual({ valid: true });
    });
  });

  describe('preview functionality', () => {
    it('should preview template transformation', () => {
      injector.setInputTemplate('问题：{{ text }}');
      
      const preview = injector.preview('这是测试文本');
      
      expect(preview).toEqual({
        original: '这是测试文本',
        transformed: '问题：这是测试文本',
        hasChanges: true,
      });
    });

    it('should handle preview with no template', () => {
      const preview = injector.preview('测试文本');
      
      expect(preview).toEqual({
        original: '测试文本',
        transformed: '测试文本',
        hasChanges: false,
      });
    });

    it('should handle preview with invalid template', () => {
      injector.setInputTemplate('{{ invalid');
      
      const preview = injector.preview('测试文本');
      
      expect(preview).toEqual({
        original: '测试文本',
        transformed: '测试文本',
        hasChanges: false,
        error: expect.any(String),
      });
    });
  });

  describe('template variable analysis', () => {
    it('should detect text placeholder', () => {
      injector.setInputTemplate('请回答：{{ text }}');
      expect(injector.hasTextPlaceholder()).toBe(true);
      
      injector.setInputTemplate('没有占位符的模板');
      expect(injector.hasTextPlaceholder()).toBe(false);
      
      injector.setInputTemplate('{{ other }}');
      expect(injector.hasTextPlaceholder()).toBe(false);
    });

    it('should extract template variables', () => {
      injector.setInputTemplate('{{ text }} and {{ other }} and {{ text }}');
      
      const variables = injector.getTemplateVariables();
      
      expect(variables).toEqual(['text', 'other']); // 去重后的结果
    });

    it('should handle template without variables', () => {
      injector.setInputTemplate('纯文本模板');
      
      const variables = injector.getTemplateVariables();
      
      expect(variables).toEqual([]);
    });
  });

  describe('template examples', () => {
    it('should provide template examples', () => {
      const examples = InputTemplateInjector.getTemplateExamples();
      
      expect(examples).toBeInstanceOf(Object);
      expect(Object.keys(examples).length).toBeGreaterThan(0);
      expect(examples['基本包装']).toBe('请回答以下问题：{{ text }}');
    });

    it('should set template from example', () => {
      const success = injector.setTemplateFromExample('基本包装');
      
      expect(success).toBe(true);
      expect(injector.getInputTemplate()).toBe('请回答以下问题：{{ text }}');
    });

    it('should handle non-existent example', () => {
      const success = injector.setTemplateFromExample('不存在的示例');
      
      expect(success).toBe(false);
      expect(injector.getInputTemplate()).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string template', async () => {
      injector.setInputTemplate('');
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '测试内容',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('测试内容');
      expect(result.metadata.inputTemplateApplied).toBeUndefined();
    });

    it('should handle whitespace-only template', async () => {
      injector.setInputTemplate('   \t\n   ');
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '测试内容',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('测试内容');
      expect(result.metadata.inputTemplateApplied).toBeUndefined();
    });

    it('should handle empty user message content', async () => {
      injector.setInputTemplate('前缀：{{ text }}');
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('前缀：');
      expect(result.metadata.inputTemplateApplied).toBe(1);
    });

    it('should handle special characters in content', async () => {
      injector.setInputTemplate('问题：{{ text }}');
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '特殊字符：@#$%^&*(){}[]|\\:";\'<>?,./',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('问题：特殊字符：@#$%^&*(){}[]|\\:";\'<>?,./')
      expect(result.metadata.inputTemplateApplied).toBe(1);
    });

    it('should handle template with multiple text placeholders', async () => {
      injector.setInputTemplate('开始：{{ text }}，结束：{{ text }}');
      
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '中间内容',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('开始：中间内容，结束：中间内容');
      expect(result.metadata.inputTemplateApplied).toBe(1);
    });

    it('should handle very long content', async () => {
      injector.setInputTemplate('问题：{{ text }}');
      
      const longContent = 'A'.repeat(10000);
      const message: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: longContent,
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe(`问题：${longContent}`);
      expect(result.metadata.inputTemplateApplied).toBe(1);
    });
  });

  describe('template whitespace handling', () => {
    it('should handle whitespace in template placeholders', () => {
      injector.setInputTemplate('{{ text }}'); // 无空格
      expect(injector.hasTextPlaceholder()).toBe(true);
      
      injector.setInputTemplate('{{  text  }}'); // 多个空格
      expect(injector.hasTextPlaceholder()).toBe(true);
      
      injector.setInputTemplate('{{text}}'); // 无空格
      expect(injector.hasTextPlaceholder()).toBe(true);
      
      injector.setInputTemplate('{{ \t text \t }}'); // 制表符
      expect(injector.hasTextPlaceholder()).toBe(true);
    });
  });
});