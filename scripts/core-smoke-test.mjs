import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { encryptBuffer, decryptBuffer } = require('../electron/services/crypto.cjs');
const { assessAnswer, chooseIntervention, calculateMastery } = require('../electron/services/lessonEngine.cjs');

const encrypted = encryptBuffer(Buffer.from('private learner memory'), 'correct-horse-battery', 'learner-1');
assert.equal(decryptBuffer(encrypted, 'correct-horse-battery', 'learner-1').toString(), 'private learner memory');
assert.throws(() => decryptBuffer(encrypted, 'wrong-passphrase', 'learner-1'));

const question = { answer: 12 };
const wrong = assessAnswer(question, '11', 9000, false);
assert.equal(wrong.correct, false);
assert.equal(wrong.misconception, 'off-by-one counting error');
assert.equal(chooseIntervention(wrong, { interests: ['dinosaurs'] }).type, 'visual-interest');
assert.equal(calculateMastery([{ correct: true, independent: true, explained: true, transfer: true, usedHint: false }]), 100);

console.log('MindCarry core smoke test passed: encryption, wrong-passphrase rejection, assessment, adaptation and mastery.');
