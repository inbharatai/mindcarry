const QUESTIONS = [
  { id: 'add-7-5', skill: 'addition-within-20', prompt: 'What is 7 plus 5?', answer: 12, visual: '🦕🦕🦕🦕🦕🦕🦕 + 🦖🦖🦖🦖🦖' },
  { id: 'add-8-4', skill: 'addition-within-20', prompt: 'What is 8 plus 4?', answer: 12, visual: '●●●●●●●● + ●●●●' },
  { id: 'add-9-3', skill: 'addition-within-20', prompt: 'What is 9 plus 3?', answer: 12, visual: '■■■■■■■■■ + ■■■' },
];

function normaliseNumericAnswer(input) {
  if (typeof input === 'number') return input;
  const match = String(input).trim().match(/-?\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

function assessAnswer(question, answer, responseMs = 0, usedHint = false) {
  const parsed = normaliseNumericAnswer(answer);
  const correct = Number.isFinite(parsed) && parsed === question.answer;
  return {
    correct,
    independent: correct && !usedHint,
    responseMs,
    usedHint,
    misconception: correct ? null : parsed === question.answer - 1 ? 'off-by-one counting error' : 'addition strategy not yet secure',
    reasoningObservation: correct
      ? usedHint
        ? 'Solved after guided support.'
        : 'Solved independently.'
      : 'Needs a concrete or counting-on representation.',
  };
}

function chooseIntervention(assessment, learner) {
  if (assessment.correct && assessment.independent) {
    return { type: 'transfer', message: 'Great. Let us try the same idea with a different example.' };
  }
  if (learner?.interests?.includes('dinosaurs')) {
    return {
      type: 'visual-interest',
      message: 'Let us use dinosaurs. Start at the larger group and count on the smaller group.',
    };
  }
  return {
    type: 'visual',
    message: 'Let us use objects. Start at the larger number and count on.',
  };
}

function calculateMastery(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) return 0;
  const weighted = evidence.map((item) => {
    let score = item.correct ? 0.55 : 0;
    if (item.independent) score += 0.25;
    if (item.explained) score += 0.1;
    if (item.transfer) score += 0.1;
    if (item.usedHint) score -= 0.15;
    return Math.max(0, Math.min(1, score));
  });
  const average = weighted.reduce((sum, value) => sum + value, 0) / weighted.length;
  return Math.round(average * 100);
}

function nextQuestion(index = 0) {
  return QUESTIONS[index % QUESTIONS.length];
}

module.exports = { QUESTIONS, assessAnswer, chooseIntervention, calculateMastery, nextQuestion };
