const QUESTION_DATA = [
  {
    id: 'add-7-5',
    skill: 'addition-within-20',
    prompt: 'What is 7 plus 5?',
    answer: 12,
    representation: 'concrete',
    visual: '🦕🦕🦕🦕🦕🦕🦕 + 🦖🦖🦖🦖🦖',
  },
  {
    id: 'add-8-3',
    skill: 'addition-within-20',
    prompt: 'What is 8 plus 3?',
    answer: 11,
    representation: 'pictorial',
    visual: '●●●●●●●● + ●●●',
  },
  {
    id: 'add-9-6-transfer',
    skill: 'addition-within-20',
    prompt: 'Now try a new one: what is 9 plus 6?',
    answer: 15,
    representation: 'transfer',
    visual: '■■■■■■■■■ + ■■■■■■',
  },
];

const QUESTIONS = Object.freeze(QUESTION_DATA.map((question) => Object.freeze({ ...question })));

const NUMBER_WORDS = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
});

function normaliseNumericAnswer(input) {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  const text = String(input ?? '').trim().toLowerCase();
  const candidates = [];

  for (const match of text.matchAll(/-?\d+(?:\.\d+)?/g)) {
    candidates.push({ index: match.index ?? 0, value: Number(match[0]) });
  }

  for (const match of text.matchAll(/[a-z]+/g)) {
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, match[0])) {
      candidates.push({ index: match.index ?? 0, value: NUMBER_WORDS[match[0]] });
    }
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates.length ? candidates[candidates.length - 1].value : Number.NaN;
}

function classifyMisconception(question, parsed) {
  if (!Number.isFinite(parsed)) return 'answer could not be interpreted as a number';
  if (parsed === question.answer - 1 || parsed === question.answer + 1) return 'off-by-one counting error';
  if (parsed === Math.max(question.answer - 2, 0)) return 'may have stopped counting before adding every item';
  return 'addition strategy is not yet secure';
}

function assessAnswer(question, answer, responseMs = 0, usedHint = false) {
  if (!question || !Number.isFinite(question.answer)) throw new Error('Lesson question is invalid.');
  const parsed = normaliseNumericAnswer(answer);
  const correct = Number.isFinite(parsed) && parsed === question.answer;
  const latency = Math.max(0, Math.min(Number(responseMs) || 0, 30 * 60 * 1000));
  return {
    parsedAnswer: Number.isFinite(parsed) ? parsed : null,
    correct,
    independent: correct && !usedHint,
    responseMs: latency,
    usedHint: Boolean(usedHint),
    misconception: correct ? null : classifyMisconception(question, parsed),
    reasoningObservation: correct
      ? usedHint
        ? 'Solved correctly after guided support.'
        : 'Solved correctly without a recorded hint.'
      : 'Requires another representation and an independent recheck.',
  };
}

function chooseIntervention(assessment, learner = {}) {
  if (assessment.correct && assessment.independent) {
    return { type: 'transfer', message: 'You solved that independently. Let us check the same idea with a new example.' };
  }
  const interests = Array.isArray(learner.interests)
    ? learner.interests.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : [];
  const theme = interests[0]?.slice(0, 50);
  if (theme) {
    return {
      type: 'visual-interest',
      message: `Let us use ${theme}. Start with the larger number and count on the smaller group one step at a time.`,
    };
  }
  return {
    type: 'visual',
    message: 'Let us use objects. Start with the larger number and count on the smaller group one step at a time.',
  };
}

function calculateMastery(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) return 0;
  const capped = evidence.slice(-6);
  const scored = capped.map((item, index) => {
    let score = item.correct ? 0.5 : 0;
    if (item.independent) score += 0.25;
    if (item.explained) score += 0.1;
    if (item.transfer) score += 0.15;
    if (item.usedHint) score -= 0.15;
    const recencyWeight = index + 1;
    return { score: Math.max(0, Math.min(1, score)), weight: recencyWeight };
  });
  const totalWeight = scored.reduce((sum, item) => sum + item.weight, 0);
  let result = Math.round(
    (scored.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight) * 100,
  );
  const independentCorrect = capped.filter((item) => item.correct && item.independent).length;
  const independentTransfer = capped.some((item) => item.correct && item.independent && item.transfer);
  if (independentCorrect < 2 || !independentTransfer) result = Math.min(result, 79);
  return Math.max(0, Math.min(100, result));
}

function masteryStatus(mastery) {
  if (mastery >= 90) return 'mastered';
  if (mastery >= 75) return 'nearly mastered';
  if (mastery >= 45) return 'developing';
  return 'introduced';
}

function shouldComplete(evidence) {
  if (!Array.isArray(evidence) || evidence.length < QUESTIONS.length) return false;
  const last = evidence[evidence.length - 1];
  return Boolean(last?.correct && last?.independent && last?.transfer);
}

function nextQuestion(index = 0) {
  const safeIndex = Math.max(0, Math.min(Number(index) || 0, QUESTIONS.length - 1));
  return QUESTIONS[safeIndex];
}

module.exports = {
  QUESTIONS,
  assessAnswer,
  calculateMastery,
  chooseIntervention,
  masteryStatus,
  nextQuestion,
  normaliseNumericAnswer,
  shouldComplete,
};