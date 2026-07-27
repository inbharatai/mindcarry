import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { assessAnswer, chooseIntervention, calculateMastery } = require('../electron/services/lessonEngine.cjs');

describe('lesson engine', () => {
  it('recognises an independent correct answer', () => {
    expect(assessAnswer({ answer: 12 }, '12', 2000, false)).toMatchObject({ correct: true, independent: true });
  });

  it('uses a learner interest when reteaching', () => {
    const result = chooseIntervention({ correct: false }, { interests: ['dinosaurs'] });
    expect(result.type).toBe('visual-interest');
  });

  it('does not mark weak evidence as mastered', () => {
    expect(calculateMastery([{ correct: true, independent: false, explained: false, transfer: false, usedHint: true }])).toBeLessThan(80);
  });
});
