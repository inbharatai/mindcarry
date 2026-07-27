import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  assessAnswer,
  calculateMastery,
  chooseIntervention,
  masteryStatus,
  normaliseNumericAnswer,
  shouldComplete,
} = require('../electron/services/lessonEngine.cjs');

describe('lesson engine', () => {
  it('recognises digits and spoken number words', () => {
    expect(normaliseNumericAnswer('12')).toBe(12);
    expect(normaliseNumericAnswer('I think it is twelve')).toBe(12);
    expect(normaliseNumericAnswer('fifteen.')).toBe(15);
  });

  it('recognises an independent correct answer', () => {
    expect(assessAnswer({ answer: 12 }, 'twelve', 2000, false)).toMatchObject({
      correct: true,
      independent: true,
      parsedAnswer: 12,
    });
  });

  it('detects a common off-by-one misconception', () => {
    expect(assessAnswer({ answer: 12 }, '11', 2000, false)).toMatchObject({
      correct: false,
      misconception: 'off-by-one counting error',
    });
  });

  it('uses a learner interest when reteaching', () => {
    const result = chooseIntervention({ correct: false }, { interests: ['Dinosaurs'] });
    expect(result.type).toBe('visual-interest');
    expect(result.message).toContain('dinosaurs');
  });

  it('does not mark weak evidence as mastered', () => {
    expect(calculateMastery([
      { correct: true, independent: false, explained: false, transfer: false, usedHint: true },
    ])).toBeLessThan(80);
  });

  it('requires an independent transfer answer before completing', () => {
    const incomplete = [
      { correct: true, independent: true, transfer: false },
      { correct: true, independent: true, transfer: false },
      { correct: true, independent: false, transfer: true },
    ];
    expect(shouldComplete(incomplete)).toBe(false);
    expect(calculateMastery(incomplete)).toBeLessThan(80);
  });

  it('maps mastery scores to explainable statuses', () => {
    expect(masteryStatus(30)).toBe('introduced');
    expect(masteryStatus(60)).toBe('developing');
    expect(masteryStatus(80)).toBe('nearly mastered');
    expect(masteryStatus(95)).toBe('mastered');
  });
});
