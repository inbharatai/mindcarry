const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 20_000;

function sanitiseText(value, fallback) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.slice(0, 600);
}

function isTransient(error) {
  const status = Number(error?.status || error?.code || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function safeErrorMessage(error) {
  const status = Number(error?.status || error?.code || 0);
  if (status === 401 || status === 403) return 'Gemini rejected the API key or project permissions.';
  if (status === 429) return 'Gemini rate limit reached. MindCarry will use the local fallback explanation.';
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'Gemini did not respond within 20 seconds.';
  return 'Gemini is temporarily unavailable. MindCarry will continue in safe demo mode.';
}

class DemoProvider {
  constructor() {
    this.name = 'Demo tutor';
  }

  async healthCheck() {
    return { ok: true, provider: 'demo', message: 'Local demo provider is ready.' };
  }

  async explain({ learnerName, interest }) {
    const theme = String(interest || 'objects').slice(0, 50);
    return {
      text: `${learnerName}, let us try a ${theme} example. Start with the larger number and count on one step at a time.`,
      provider: 'demo',
    };
  }
}

class GeminiProvider {
  constructor(apiKey, model = DEFAULT_GEMINI_MODEL) {
    if (typeof apiKey !== 'string' || apiKey.trim().length < 20) throw new Error('Gemini API key is invalid.');
    this.apiKey = apiKey.trim();
    this.model = model || DEFAULT_GEMINI_MODEL;
    this.name = 'Gemini';
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const { GoogleGenAI } = await import('@google/genai');
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async generate(parameters, retries = 1) {
    const client = await this.getClient();
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await client.models.generateContent({
          ...parameters,
          config: {
            ...(parameters.config || {}),
            abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        });
      } catch (error) {
        lastError = error;
        if (!isTransient(error) || attempt >= retries) break;
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
    const safe = new Error(safeErrorMessage(lastError));
    safe.cause = lastError;
    throw safe;
  }

  async healthCheck() {
    const response = await this.generate(
      {
        model: this.model,
        contents: 'Reply with exactly READY.',
        config: { temperature: 0, maxOutputTokens: 8 },
      },
      0,
    );
    const message = sanitiseText(response.text, 'Gemini responded without text.');
    return {
      ok: message.toUpperCase().includes('READY'),
      provider: 'gemini',
      model: this.model,
      message,
    };
  }

  async explain({ learnerName, age, interest, question, misconception, successfulStrategy }) {
    const response = await this.generate({
      model: this.model,
      contents: `Current maths question: ${String(question).slice(0, 200)}\nObserved misconception: ${String(
        misconception || 'uncertain',
      ).slice(0, 160)}\nChild interest: ${String(interest || 'not known').slice(0, 80)}\nPreviously useful strategy: ${String(
        successfulStrategy || 'visual examples',
      ).slice(0, 120)}`,
      config: {
        systemInstruction: `You are MindCarry, a patient curriculum-focused AI tutor for a ${Number(age)}-year-old child named ${String(
          learnerName,
        ).slice(0, 80)}. Give one short, encouraging explanation and then ask one question. Do not provide unrelated information. Do not diagnose emotions, behaviour, health or development. Do not ask for personal information. Use at most 70 words.`,
        temperature: 0.3,
        maxOutputTokens: 140,
      },
    });
    return {
      text: sanitiseText(response.text, 'Let us try another way. Start with the larger number and count on.'),
      provider: 'gemini',
      model: this.model,
    };
  }
}

module.exports = { DEFAULT_GEMINI_MODEL, DemoProvider, GeminiProvider, safeErrorMessage };
