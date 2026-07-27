import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { decryptBuffer, encryptBuffer } = require('../electron/services/crypto.cjs');
const {
  assessAnswer,
  calculateMastery,
  chooseIntervention,
  normaliseNumericAnswer,
  shouldComplete,
} = require('../electron/services/lessonEngine.cjs');

const passphrase = 'correct-horse-battery-staple';
const encrypted = await encryptBuffer(Buffer.from('private learner memory'), passphrase, 'learner-1');
const decrypted = await decryptBuffer(encrypted, passphrase, 'learner-1');
assert.equal(decrypted.toString(), 'private learner memory');
await assert.rejects(() => decryptBuffer(encrypted, 'wrong-passphrase', 'learner-1'));

assert.equal(normaliseNumericAnswer('twelve'), 12);
const question = { answer: 12 };
const wrong = assessAnswer(question, '11', 9000, false);
assert.equal(wrong.correct, false);
assert.equal(wrong.misconception, 'off-by-one counting error');
assert.equal(chooseIntervention(wrong, { interests: ['dinosaurs'] }).type, 'visual-interest');

const evidence = [
  { correct: false, independent: false, explained: true, transfer: false, usedHint: false },
  { correct: true, independent: true, explained: true, transfer: false, usedHint: false },
  { correct: true, independent: true, explained: true, transfer: true, usedHint: false },
];
assert.equal(shouldComplete(evidence), true);
assert.ok(calculateMastery(evidence) >= 75);

console.log('MindCarry core smoke test passed: encryption, rejection, answer parsing, adaptation and mastery.');
