import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  QUESTIONS,
  assessAnswer,
  calculateMastery,
  chooseIntervention,
  masteryStatus,
  nextQuestion,
  normaliseNumericAnswer,
  shouldComplete,
} = require('../electron/services/lessonEngine.cjs');

describe('lesson engine', () => {
  it('recognises digits, spoken number words and the final stated answer', () => {
    expect(normaliseNumericAnswer('12')).toBe(12);
    expect(normaliseNumericAnswer('I think it is twelve')).toBe(12);
    expect(normaliseNumericAnswer('fifteen.')).toBe(15);
    expect(normaliseNumericAnswer('Seven plus five is twelve')).toBe(12);
    expect(normaliseNumericAnswer('I counted 8, 9, 10, 11')).toBe(11);
    expect(Number.isNaN(normaliseNumericAnswer('I do not know'))).toBe(true);
  });

  it('uses three distinct, immutable diagnostic questions', () => {
    expect(QUESTIONS).toHaveLength(3);
    expect(new Set(QUESTIONS.map((question: { answer: number }) => question.answer)).size).toBe(3);
    expect(nextQuestion(1)).toMatchObject({ id: 'add-8-3', answer: 11, representation: 'pictorial' });
    expect(Object.isFrozen(QUESTIONS)).toBe(true);
    expect(QUESTIONS.every((question: object) => Object.isFrozen(question))).toBe(true);
  });

  it('recognises an independent correct answer', () => {
    expect(assessAnswer({ answer: 12 }, 'seven plus five is twelve', 2000, false)).toMatchObject({
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

  it('bounds impossible response times', () => {
    expect(assessAnswer({ answer: 12 }, '12', -100, false).responseMs).toBe(0);
    expect(assessAnswer({ answer: 12 }, '12', Number.MAX_SAFE_INTEGER, false).responseMs).toBe(30 * 60 * 1000);
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