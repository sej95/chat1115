import { describe, it, expect, beforeEach } from 'vitest';
import { SystemRoleInjector } from '../SystemRoleInjector';
import type { PipelineContext, AgentState } from '../../types';

describe('SystemRoleInjector', () => {
  let injector: SystemRoleInjector;
  let mockContext: PipelineContext;

  beforeEach(() => {
    injector = new SystemRoleInjector('You are a helpful assistant');
    mockContext = {
      initialState: { messages: [] } as AgentState,
      messages: [],
      metadata: { model: 'gpt-4', maxTokens: 1000 },
      isAborted: false,
    };
  });

  describe('constructor', () => {
    it('should create injector with system role', () => {
      expect(injector.getSystemRole()).toBe('You are a helpful assistant');
    });

    it('should accept options', () => {
      const injectorWithOptions = new SystemRoleInjector('Test', { debug: true });
      expect(injectorWithOptions).toBeInstanceOf(SystemRoleInjector);
    });
  });

  describe('process', () => {
    it('should inject system role when messages are empty', async () => {
      const result = await injector.process(mockContext);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('You are a helpful assistant');
      expect(result.metadata.systemRoleInjected).toBe(true);
    });

    it('should merge with existing system message', async () => {
      mockContext.messages = [
        { id: '1', role: 'system', content: 'Existing system message' },
      ];

      const result = await injector.process(mockContext);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Existing system message\n\nYou are a helpful assistant');
    });

    it('should skip injection when system role is empty', async () => {
      const emptyInjector = new SystemRoleInjector('');
      const result = await emptyInjector.process(mockContext);

      expect(result.messages).toHaveLength(0);
      expect(result.metadata.systemRoleInjected).toBeUndefined();
    });

    it('should skip injection when system role is whitespace', async () => {
      const whitespaceInjector = new SystemRoleInjector('   ');
      const result = await whitespaceInjector.process(mockContext);

      expect(result.messages).toHaveLength(0);
    });

    it('should preserve existing messages order', async () => {
      mockContext.messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi!' },
      ];

      const result = await injector.process(mockContext);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].role).toBe('user');
      expect(result.messages[2].role).toBe('assistant');
    });

    it('should add metadata about injection', async () => {
      const result = await injector.process(mockContext);

      expect(result.metadata.systemRoleInjected).toBe(true);
      expect(result.metadata.systemRoleLength).toBe('You are a helpful assistant'.length);
    });

    it('should not modify original context', async () => {
      const originalMessages = [...mockContext.messages];
      await injector.process(mockContext);

      expect(mockContext.messages).toEqual(originalMessages);
    });

    it('should mark as executed', async () => {
      const result = await injector.process(mockContext);

      expect(result.metadata.executedProcessors).toContain('SystemRoleInjector');
    });
  });

  describe('utility methods', () => {
    it('should set system role', () => {
      injector.setSystemRole('New role');
      expect(injector.getSystemRole()).toBe('New role');
    });

    it('should validate system role', () => {
      expect(injector.isValidSystemRole()).toBe(true);
      
      injector.setSystemRole('');
      expect(injector.isValidSystemRole()).toBe(false);
      
      injector.setSystemRole('   ');
      expect(injector.isValidSystemRole()).toBe(false);
    });

    it('should chain method calls', () => {
      const result = injector.setSystemRole('Chained role');
      expect(result).toBe(injector);
      expect(injector.getSystemRole()).toBe('Chained role');
    });
  });


  describe('edge cases', () => {
    it('should handle very long system role', async () => {
      const longRole = 'A'.repeat(10000);
      const longInjector = new SystemRoleInjector(longRole);
      
      const result = await longInjector.process(mockContext);
      
      expect(result.messages[0].content).toBe(longRole);
      expect(result.metadata.systemRoleLength).toBe(10000);
    });

    it('should handle special characters in system role', async () => {
      const specialRole = 'System role with\nnewlines and\ttabs and "quotes"';
      const specialInjector = new SystemRoleInjector(specialRole);
      
      const result = await specialInjector.process(mockContext);
      
      expect(result.messages[0].content).toBe(specialRole);
    });

    it('should handle unicode characters', async () => {
      const unicodeRole = '你好，我是AI助手 🤖';
      const unicodeInjector = new SystemRoleInjector(unicodeRole);
      
      const result = await unicodeInjector.process(mockContext);
      
      expect(result.messages[0].content).toBe(unicodeRole);
    });
  });
});