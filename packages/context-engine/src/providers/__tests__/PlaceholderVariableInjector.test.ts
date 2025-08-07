import { describe, it, expect, beforeEach } from 'vitest';
import { PlaceholderVariableInjector } from '../PlaceholderVariableInjector';
import type { PipelineContext, ChatMessage } from '../../types';

describe('PlaceholderVariableInjector', () => {
  let injector: PlaceholderVariableInjector;
  let mockContext: PipelineContext;

  beforeEach(() => {
    injector = new PlaceholderVariableInjector();
    
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
    it('should initialize with empty variables by default', () => {
      expect(injector.getVariables()).toEqual({});
    });

    it('should initialize with provided variables', () => {
      const variables = { name: 'John', age: 30 };
      const varInjector = new PlaceholderVariableInjector(variables);
      
      expect(varInjector.getVariables()).toEqual(variables);
    });
  });


  describe('doProcess method', () => {
    it('should return context unchanged when no variables configured', async () => {
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '{{name}} 你好',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('{{name}} 你好');
      expect(result.executionInfo.executedProcessors).toContain('PlaceholderVariableInjector');
    });

    it('should replace simple interpolation placeholders', async () => {
      injector.setVariables({ name: 'Alice', city: '北京' });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '你好 {{name}}，欢迎来到 {{city}}！',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('你好 Alice，欢迎来到 北京！');
      expect(result.metadata.placeholdersProcessed).toBe(1);
      expect(result.metadata.placeholderErrors).toBe(0);
    });

    it('should replace escape placeholders', async () => {
      injector.setVariables({ html: '<script>alert("test")</script>' });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '内容: {{{html}}}',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('&lt;script&gt;');
      expect(result.metadata.placeholdersProcessed).toBe(1);
    });

    it('should handle evaluate placeholders', async () => {
      injector.setVariables({ 
        user: { name: 'Bob', age: 25 },
        items: ['apple', 'banana', 'orange']
      });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '用户信息: {% print(user.name + " (" + user.age + "岁)") %}, 项目数量: {% print(items.length) %}',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('Bob (25岁)');
      expect(result.messages[0].content).toContain('项目数量: 3');
      expect(result.metadata.placeholdersProcessed).toBe(1);
    });

    it('should process multiple messages', async () => {
      injector.setVariables({ greeting: '你好', name: 'Charlie' });
      
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '{{greeting}} {{name}}',
          createdAt: Date.now(),
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: '我是助手，{{greeting}}！',
          createdAt: Date.now(),
        },
        {
          id: 'msg3',
          role: 'user',
          content: '没有占位符的消息',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('你好 Charlie');
      expect(result.messages[1].content).toBe('我是助手，你好！');
      expect(result.messages[2].content).toBe('没有占位符的消息');
      expect(result.metadata.placeholdersProcessed).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      injector.setVariables({ name: 'Dave' });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '{{name}} 和 {{undefinedVar}}',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      // 出错时返回原消息
      expect(result.messages[0].content).toBe('{{name}} 和 {{undefinedVar}}');
      expect(result.metadata.placeholderErrors).toBe(1);
    });
  });

  describe('variable management', () => {
    it('should set and get variables', () => {
      const variables = { a: 1, b: '测试', c: true };
      
      injector.setVariables(variables);
      
      expect(injector.getVariables()).toEqual(variables);
    });

    it('should add single variable', () => {
      injector.addVariable('key1', 'value1');
      injector.addVariable('key2', 42);
      
      expect(injector.getVariables()).toEqual({
        key1: 'value1',
        key2: 42,
      });
    });

    it('should remove variable', () => {
      injector.setVariables({ a: 1, b: 2, c: 3 });
      
      injector.removeVariable('b');
      
      expect(injector.getVariables()).toEqual({ a: 1, c: 3 });
    });

    it('should clear all variables', () => {
      injector.setVariables({ a: 1, b: 2 });
      expect(Object.keys(injector.getVariables())).toHaveLength(2);
      
      injector.clearVariables();
      
      expect(injector.getVariables()).toEqual({});
    });

    it('should support method chaining', () => {
      const result = injector
        .addVariable('a', 1)
        .addVariable('b', 2)
        .removeVariable('a')
        .setVariables({ c: 3 })
        .clearVariables();
      
      expect(result).toBe(injector);
      expect(injector.getVariables()).toEqual({});
    });
  });

  describe('placeholder detection', () => {
    it('should detect various placeholder formats', () => {
      const testCases = [
        '{{name}}',
        '{{{html}}}',
        '{% code %}',
        '{{name}} and {{{html}}} and {% code %}',
      ];
      
      testCases.forEach(text => {
        const extracted = injector.extractPlaceholders(text);
        expect(extracted.length).toBeGreaterThan(0);
      });
    });

    it('should not detect non-placeholder text', () => {
      const testCases = [
        '普通文本',
        '{单个括号}',
        '{{}}', // 空占位符
        '{ {name} }', // 空格分隔
      ];
      
      testCases.forEach(text => {
        const extracted = injector.extractPlaceholders(text);
        expect(extracted).toEqual([]);
      });
    });

    it('should extract placeholder names correctly', () => {
      const text = '{{name}} 和 {{{html}}} 还有 {% user.age %}';
      const placeholders = injector.extractPlaceholders(text);
      
      expect(placeholders).toEqual(['name', 'html', 'user.age']);
    });

    it('should remove duplicate placeholders', () => {
      const text = '{{name}} {{name}} {{{name}}}';
      const placeholders = injector.extractPlaceholders(text);
      
      expect(placeholders).toEqual(['name']);
    });
  });

  describe('preview functionality', () => {
    it('should preview placeholder replacement', () => {
      injector.setVariables({ name: 'Emma', age: 28 });
      
      const preview = injector.preview('你好 {{name}}，你今年 {{age}} 岁了。');
      
      expect(preview).toEqual({
        original: '你好 {{name}}，你今年 {{age}} 岁了。',
        processed: '你好 Emma，你今年 28 岁了。',
        hasChanges: true,
      });
    });

    it('should preview text without placeholders', () => {
      injector.setVariables({ name: 'Frank' });
      
      const preview = injector.preview('这是普通文本');
      
      expect(preview).toEqual({
        original: '这是普通文本',
        processed: '这是普通文本',
        hasChanges: false,
      });
    });

    it('should handle preview errors gracefully', () => {
      injector.setVariables({ name: 'Grace' });
      
      const preview = injector.preview('{{name}} 和 {{unknownVar}}');
      
      expect(preview.hasChanges).toBe(false);
      expect(preview.original).toBe(preview.processed);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      injector.setVariables({ name: 'Henry' });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('');
      expect(result.metadata.placeholdersProcessed).toBe(0);
    });

    it('should handle non-string content', async () => {
      injector.setVariables({ name: 'Iris' });
      
      const message: any = {
        id: 'msg1',
        role: 'user',
        content: null,
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe(null);
      expect(result.metadata.placeholdersProcessed).toBe(0);
    });

    it('should handle complex variable types', async () => {
      injector.setVariables({
        obj: { name: 'Jack', details: { age: 30, city: 'Shanghai' } },
        arr: [1, 2, 3],
        fn: () => 'function result',
        date: new Date('2024-01-01'),
      });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '对象: {{obj.name}}, 数组长度: {% print(arr.length) %}, 日期: {{date}}',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('Jack');
      expect(result.messages[0].content).toContain('数组长度: 3');
      expect(result.messages[0].content).toContain('2024');
    });

    it('should handle nested placeholders correctly', () => {
      injector.setVariables({ key: 'name', name: 'Kate' });
      
      // 这种嵌套不应该被处理，因为模板引擎不支持动态键名
      const text = '{{{{key}}}}';
      const placeholders = injector.extractPlaceholders(text);
      
      expect(placeholders).toEqual(['{{key}}']);
    });

    it('should handle special characters in variable names', async () => {
      injector.setVariables({ 
        'var-with-dash': 'dash value',
        'var_with_underscore': 'underscore value',
        'var123': 'numeric value',
      });
      
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '{{var_with_underscore}} 和 {{var123}}',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('underscore value 和 numeric value');
    });

    it('should handle whitespace in placeholders', () => {
      injector.setVariables({ name: 'Liam' });
      
      const testCases = [
        '{{ name }}',
        '{{  name  }}',
        '{{\tname\t}}',
        '{{\nname\n}}',
      ];
      
      testCases.forEach(text => {
        const placeholders = injector.extractPlaceholders(text);
        expect(placeholders).toContain('name');
      });
    });

    it('should preserve original message when no changes needed', async () => {
      injector.setVariables({ name: 'Maya' });
      
      const originalMessage: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '没有占位符的内容',
        createdAt: Date.now(),
        extra: 'should be preserved',
      };
      
      mockContext.messages = [originalMessage];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages[0]).toBe(originalMessage); // 引用相同
      expect(result.metadata.placeholdersProcessed).toBe(0);
    });
  });

  describe('update metadata', () => {
    it('should update metadata with processing statistics', async () => {
      injector.setVariables({ 
        name: 'Noah', 
        age: 32,
        city: 'Guangzhou'
      });
      
      const messages: ChatMessage[] = [
        { id: 'msg1', role: 'user', content: '{{name}}', createdAt: Date.now() },
        { id: 'msg2', role: 'user', content: '{{age}} in {{city}}', createdAt: Date.now() },
        { id: 'msg3', role: 'user', content: 'no placeholders', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      expect(result.metadata.placeholdersProcessed).toBe(2);
      expect(result.metadata.placeholderErrors).toBe(0);
      expect(result.metadata.availableVariables).toEqual(['name', 'age', 'city']);
    });
  });
});