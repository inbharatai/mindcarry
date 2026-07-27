type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function speak(text: string, rate = 0.92): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
}

export function listenOnce(
  onText: (text: string) => void,
  onError: (message: string) => void,
  onEnd: () => void,
): (() => void) | null {
  const candidate = (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor });
  const Recognition = candidate.SpeechRecognition || candidate.webkitSpeechRecognition;
  if (!Recognition) {
    onError('Speech recognition is not available on this device. You can type the answer.');
    return null;
  }
  const recognition = new Recognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript;
    if (text) onText(text);
  };
  recognition.onerror = (event) => onError(`Microphone error: ${event.error}`);
  recognition.onend = onEnd;
  recognition.start();
  return () => recognition.stop();
}
