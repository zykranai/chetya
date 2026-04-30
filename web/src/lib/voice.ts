/** Wrappers for the browser Speech Recognition and Speech Synthesis APIs (dictation + read-aloud). */

export function speechApisSupported(): { listen: boolean; speak: boolean } {
  if (typeof window === 'undefined') return { listen: false, speak: false };
  const listen = !!(window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition);
  const speak = typeof window.speechSynthesis !== 'undefined';
  return { listen, speak };
}

/** BCP-47 tags for recognition / synthesis (best-effort per app language code). */
export function bcp47ForAppLanguage(code: string): string {
  const c = code.toLowerCase();
  const map: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    hinglish: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    ur: 'ur-IN',
    es: 'es-ES',
    fr: 'fr-FR',
    ar: 'ar-SA',
  };
  return map[c] || 'en-US';
}

/** Plain text for TTS — strip markdown-ish noise and URLs */
export function textForSpeech(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function speakAloud(text: string, langTag: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const plain = textForSpeech(text);
  if (!plain) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = langTag;
  u.rate = 0.92;
  u.pitch = 1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

type RecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitSpeechRecognition?: RecognitionCtor };
  return window.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export type VoiceListenCallbacks = {
  onUpdate: (fullTranscript: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

/** Start continuous dictation until aborted via returned stop(). */
export function startListening(langTag: string, cb: VoiceListenCallbacks): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    cb.onError('Voice input is not supported in this browser.');
    return () => {};
  }

  let accumulated = '';
  const rec = new Ctor();
  rec.lang = langTag;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript ?? '';
      if (event.results[i].isFinal) accumulated += piece;
      else interim += piece;
    }
    cb.onUpdate((accumulated + interim).trim());
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted') return;
    const friendly =
      event.error === 'not-allowed'
        ? 'Microphone permission denied — enable it in browser settings.'
        : event.error === 'no-speech'
          ? 'No speech heard — try again a little closer to the mic.'
          : `Voice error: ${event.error}`;
    cb.onError(friendly);
  };

  rec.onend = () => {
    cb.onEnd();
  };

  try {
    rec.start();
  } catch {
    cb.onError('Could not start microphone.');
    return () => {};
  }

  return () => {
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
  };
}
