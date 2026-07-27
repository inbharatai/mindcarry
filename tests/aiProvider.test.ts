import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { GeminiProvider, sanitiseContext } = require('../electron/services/aiProvider.cjs');

describe('Gemini provider boundary', () => {
  it('bounds and sanitises learner context', () => {
    const value = sanitiseContext(`hello\u0000   world ${'x'.repeat(2500)}`);
    expect(value).not.toContain('\u0000');
    expect(value.length).toBeLessThanOrEqual(1800);
    expect(value).toContain('hello world');
  });

  it('does not include the child name in an explanation request', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: 'Start with 8 and count on three steps. What is the total?' });
    const provider = new GeminiProvider('test-key-that-is-long-enough-for-validation');
    provider.client = { models: { generateContent } };

    const result = await provider.explain({
      learnerName: 'Aarav',
      age: 7,
      interest: 'dinosaurs',
      question: 'What is 8 plus 3?',
      misconception: 'off-by-one counting error',
      successfulStrategy: 'counting on',
      memoryContext: 'Learner showed skill evidence in addition within 20.',
    });

    expect(result.provider).toBe('gemini');
    expect(generateContent).toHaveBeenCalledTimes(1);
    const request = generateContent.mock.calls[0][0];
    const serialised = JSON.stringify(request);
    expect(serialised).not.toContain('Aarav');
    expect(serialised).toContain('7-year-old learner');
    expect(serialised).toContain('Learner showed skill evidence');
    expect(request.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(request.config.maxOutputTokens).toBe(140);
  });

  it('uses a zero thinking budget for the API-key health check', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: 'READY' });
    const provider = new GeminiProvider('test-key-that-is-long-enough-for-validation');
    provider.client = { models: { generateContent } };

    const result = await provider.healthCheck();
    expect(result.ok).toBe(true);
    expect(generateContent.mock.calls[0][0].config).toMatchObject({
      temperature: 0,
      maxOutputTokens: 8,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });
});