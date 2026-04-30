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

/** Some browsers populate voices asynchronously (especially Safari). */
export function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.getVoices().length > 0) {
      resolve();
      return;
    }
    const done = () => {
      synth.removeEventListener('voiceschanged', done);
      resolve();
    };
    synth.addEventListener('voiceschanged', done);
    window.setTimeout(done, 750);
  });
}

function scoreVoice(v: SpeechSynthesisVoice, langTag: string): number {
  let s = 0;
  const base = langTag.toLowerCase().split('-')[0] || 'en';
  const vl = v.lang.toLowerCase();
  if (vl.startsWith(base)) s += 120;
  else if (vl.includes(base)) s += 60;
  const bundle = `${v.name} ${v.voiceURI}`.toLowerCase();
  if (bundle.includes('neural')) s += 45;
  if (bundle.includes('natural') || bundle.includes('premium') || bundle.includes('enhanced')) s += 38;
  if (bundle.includes('google')) s += 28;
  if (bundle.includes('microsoft')) s += 22;
  if (bundle.includes('wavenet')) s += 25;
  return s;
}

/** Pick the most natural local voice for the language (OS / browser dependent). */
export function pickVoiceForLanguage(langTag: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const sc = scoreVoice(v, langTag);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  return best;
}

/**
 * Speak text with a calm, conversational pace. Resolves when playback finishes or errors (never hangs).
 */
export function speakAloud(text: string, langTag: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const plain = textForSpeech(text);
    if (!plain) {
      resolve();
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const speakNow = () => {
      const voice = pickVoiceForLanguage(langTag);
      const u = new SpeechSynthesisUtterance(plain);
      u.lang = langTag;
      if (voice) u.voice = voice;
      u.rate = 0.91;
      u.pitch = 0.97;
      u.volume = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    };

    void ensureVoicesLoaded().then(() => {
      try {
        speakNow();
      } catch {
        resolve();
      }
    });
  });
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

const IGNORABLE_RECOGNITION_ERRORS = new Set(['aborted']);

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
    if (IGNORABLE_RECOGNITION_ERRORS.has(event.error)) return;
    const friendly =
      event.error === 'not-allowed'
        ? 'Microphone permission denied — enable it in your browser settings.'
        : event.error === 'no-speech'
          ? 'No speech detected — tap the mic and speak again, a little closer.'
          : event.error === 'audio-capture'
            ? 'No microphone found — plug one in or allow access.'
            : event.error === 'network'
              ? 'Voice recognition needs a network connection in this browser — try again.'
              : event.error === 'service-not-allowed'
                ? 'Voice recognition is disabled — check browser settings.'
                : `Voice error (${event.error}). Try again.`;
    cb.onError(friendly);
  };

  rec.onend = () => {
    cb.onEnd();
  };

  try {
    rec.start();
  } catch {
    cb.onError('Could not start microphone — try refreshing the page.');
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
