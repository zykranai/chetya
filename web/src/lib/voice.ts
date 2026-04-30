/** Wrappers for the browser Speech Recognition and Speech Synthesis APIs (dictation + read-aloud). */

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition };
  return window.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function speechApisSupported(): { listen: boolean; speak: boolean } {
  if (typeof window === 'undefined') return { listen: false, speak: false };
  const ctor = getRecognitionCtor();
  const secure = typeof window.isSecureContext === 'boolean' ? window.isSecureContext : true;
  const listen = !!ctor && secure;
  const speak = typeof window.speechSynthesis !== 'undefined';
  return { listen, speak };
}

/**
 * Non-fatal heads-up for environments where the API exists but rarely works well (esp. iOS browsers).
 */
export function voiceEnvironmentWarning(): string | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  if (!window.isSecureContext) {
    return 'Voice needs a secure page (https://). Open the site over HTTPS, not plain HTTP.';
  }
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 'iPhone/iPad browsers often block web speech-to-text. For voice, use Chrome or Edge on a desktop or laptop, or Chrome on Android.';
  }
  return null;
}

/**
 * Many Chromium/WebKit builds only unlock speech recognition reliably after the mic was opened once via getUserMedia.
 */
export async function primeMicrophone(): Promise<{ ok: boolean; message?: string }> {
  if (typeof navigator === 'undefined') return { ok: true };
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: true };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (e) {
    const err = e as DOMException;
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return {
        ok: false,
        message:
          'Microphone blocked — click the lock or tune icon in the address bar, allow Microphone, then try again.',
      };
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return { ok: false, message: 'No microphone found — connect one or check system sound input settings.' };
    }
    if (err.name === 'NotReadableError') {
      return { ok: false, message: 'Microphone is in use by another app — close other tabs or apps using the mic.' };
    }
    return { ok: false, message: 'Could not open the microphone — check permissions and try again.' };
  }
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

export type VoiceListenCallbacks = {
  onUpdate: (fullTranscript: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

const IGNORABLE_RECOGNITION_ERRORS = new Set(['aborted']);

/**
 * Start dictation until aborted via returned stop().
 * Note: start() must be invoked synchronously from a click/key handler (user gesture), or many browsers capture no audio.
 */
export function startListening(langTag: string, cb: VoiceListenCallbacks): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    cb.onError('Voice input is not supported in this browser — try Chrome or Edge on desktop.');
    return () => {};
  }

  let accumulated = '';
  const rec = new Ctor();
  rec.lang = langTag || 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const row = event.results[i];
      if (!row?.length) continue;
      const piece = row[0]?.transcript ?? '';
      if (row.isFinal) accumulated += piece;
      else interim += piece;
    }
    cb.onUpdate((accumulated + interim).trim());
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (IGNORABLE_RECOGNITION_ERRORS.has(event.error)) return;
    const friendly =
      event.error === 'not-allowed'
        ? 'Microphone permission denied — allow the mic for this site in your browser settings.'
        : event.error === 'no-speech'
          ? 'No speech captured — speak right after tapping the mic; check input volume.'
          : event.error === 'audio-capture'
            ? 'Could not read audio — allow microphone access or try another browser.'
            : event.error === 'network'
              ? 'Speech recognition needs internet in Chrome — check connection and try again.'
              : event.error === 'service-not-allowed'
                ? 'Speech recognition is disabled in this browser — enable it in settings or try Chrome.'
                : `Voice error (${event.error}). Try Chrome/Edge on desktop.`;
    cb.onError(friendly);
  };

  rec.onend = () => {
    cb.onEnd();
  };

  try {
    rec.start();
  } catch {
    cb.onError('Could not start microphone — refresh the page and try again.');
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
