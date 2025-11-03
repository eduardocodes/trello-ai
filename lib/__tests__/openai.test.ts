import { isOpenAIConfigured } from '../openai';

describe('OpenAI Configuration', () => {
  describe('isOpenAIConfigured', () => {
    const originalEnv = process.env.OPENAI_API_KEY;

    afterEach(() => {
      // Restore original environment variable
      if (originalEnv !== undefined) {
        process.env.OPENAI_API_KEY = originalEnv;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it('should return true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-123';
      
      const result = isOpenAIConfigured();
      
      expect(result).toBe(true);
    });

    it('should return false when OPENAI_API_KEY is empty string', () => {
      process.env.OPENAI_API_KEY = '';
      
      const result = isOpenAIConfigured();
      
      expect(result).toBe(false);
    });

    it('should return false when OPENAI_API_KEY is undefined', () => {
      delete process.env.OPENAI_API_KEY;
      
      const result = isOpenAIConfigured();
      
      expect(result).toBe(false);
    });

    it('should return false when OPENAI_API_KEY is null-like', () => {
      delete process.env.OPENAI_API_KEY;
      
      const result = isOpenAIConfigured();
      
      expect(result).toBe(false);
    });

    it('should return true for any non-empty string value', () => {
      process.env.OPENAI_API_KEY = 'any-non-empty-value';
      
      const result = isOpenAIConfigured();
      
      expect(result).toBe(true);
    });
  });
});