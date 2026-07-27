class DemoProvider {
  constructor() {
    this.name = 'Demo tutor';
  }

  async healthCheck() {
    return { ok: true, provider: 'demo', message: 'Local demo provider is ready.' };
  }

  async explain({ learnerName, interest }) {
    const theme = interest || 'objects';
    return {
      text: `${learnerName}, let us try a ${theme} example. Start with the larger number and count on one step at a time.`,
      provider: 'demo',
    };
  }
}

class GeminiProvider {
  constructor(apiKey, model = 'gemini-3.6-flash') {
    this.apiKey = apiKey;
    this.model = model;
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

  async healthCheck() {
    const client = await this.getClient();
    const response = await client.models.generateContent({
      model: this.model,
      contents: 'Reply with exactly: READY',
      config: { temperature: 0, maxOutputTokens: 8 },
    });
    return {
      ok: String(response.text || '').toUpperCase().includes('READY'),
      provider: 'gemini',
      model: this.model,
      message: response.text || 'Gemini responded.',
    };
  }

  async explain({ learnerName, age, interest, question, misconception, successfulStrategy }) {
    const client = await this.getClient();
    const prompt = `You are MindCarry, a patient tutor for a ${age}-year-old child named ${learnerName}.
Current maths question: ${question}
Observed misconception: ${misconception || 'uncertain'}
Child interest: ${interest || 'not known'}
Previously successful strategy: ${successfulStrategy || 'visual examples'}
Give one short child-safe explanation, then ask one question. Do not reveal unrelated information. Use no more than 70 words.`;
    const response = await client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { temperature: 0.4, maxOutputTokens: 140 },
    });
    return { text: response.text || 'Let us try another way.', provider: 'gemini', model: this.model };
  }
}

module.exports = { DemoProvider, GeminiProvider };
