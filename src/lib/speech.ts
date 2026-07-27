type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string; confidence?: number } }> }) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
};

const LANGUAGE_CODES: Record<string, string> = {
  english: 'en-IN',
  hindi: 'hi-IN',
  assamese: 'as-IN',
  bengali: 'bn-IN',
  marathi: 'mr-IN',
  tamil: 'ta-IN',
  telugu: 'te-IN',
  kannada: 'kn-IN',
  malayalam: 'ml-IN',
  gujarati: 'gu-IN',
  punjabi: 'pa-IN',
};

export function languageCode(language?: string) {
  const value = String(language || 'English').trim();
  if (/^[a-z]{2,3}-[A-Z]{2}$/.test(value)) return value;
  return LANGUAGE_CODES[value.toLowerCase()] || 'en-IN';
}

export function speak(text: string, rate = 0.92, language = 'English'): void {
  if (!('speechSynthesis' in window)) return;
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = languageCode(language);
  utterance.rate = Math.max(0.65, Math.min(1.15, rate));
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
}

export function listenOnce(
  onText: (text: string) => void,
  onError: (message: string) => void,
  onEnd: () => void,
  language = 'English',
): (() => void) | null {
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Recognition = candidate.SpeechRecognition || candidate.webkitSpeechRecognition;
  if (!Recognition) {
    onError('Speech recognition is not available on this device. Type the answer instead.');
    return null;
  }

  const recognition = new Recognition();
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd();
  };

  recognition.lang = languageCode(language);
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript?.trim();
    if (text) onText(text.slice(0, 100));
  };
  recognition.onerror = (event) => {
    if (event.error === 'aborted') return;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      onError('Microphone permission was not granted. Type the answer or ask a parent to review permissions.');
    } else if (event.error === 'no-speech') {
      onError('No speech was detected. Try once more or type the answer.');
    } else if (event.error === 'audio-capture') {
      onError('No working microphone was detected. Type the answer and continue.');
    } else {
      onError('Speech recognition could not complete. Type the answer and continue.');
    }
  };
  recognition.onend = finish;

  try {
    recognition.start();
  } catch {
    onError('Speech recognition could not start. Type the answer and continue.');
    finish();
    return null;
  }

  return () => {
    if (ended) return;
    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        // The browser may already have ended the recognition session.
      }
    }
    finish();
  };
}