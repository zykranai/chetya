import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  patchLanguage,
  sendChat,
  sendGuestChat,
  fetchGuestQuota,
  fetchChatSessions,
  fetchChatMessages,
  fetchMe,
  fetchDailyReading,
  type ChatMessage,
  type ChatSessionSummary,
  GUEST_PROMPT_LIMIT,
} from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { APP_LANGUAGES } from '@/constants/languages';
import {
  bcp47ForAppLanguage,
  ensureVoicesLoaded,
  primeMicrophone,
  speechApisSupported,
  startListening,
  speakAloud,
  stopSpeaking,
  voiceEnvironmentWarning,
} from '@/lib/voice';
import { friendlyApiError } from '@/lib/apiErrors';

const SESSION_STORAGE_KEY = 'chetya_chat_session';
const VOICE_REPLY_KEY = 'chetya_voice_reply_auto';
const VOICE_CONVO_KEY = 'chetya_voice_convo';
const LIFE_CONTEXT_STORAGE_KEY = 'chetya_life_context_note';

function localCalendarDay(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dailyDismissStorageKey(userId: string): string {
  return `chetya_daily_dismiss_${userId}_${localCalendarDay()}`;
}

function dailyBodyCacheKey(userId: string, lang: string): string {
  return `chetya_daily_body_${userId}_${lang}_${localCalendarDay()}`;
}

function formatSessionTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm6-3a6 6 0 01-12 0m6 9v3m-4 0h8"
      />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5L6 9H3v6h3l5 4V5zm8.5 3a5.5 5.5 0 010 8m2.5-11a9 9 0 010 14"
      />
    </svg>
  );
}

function SendArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4l7.5 7.5-1.4 1.4L13 8.25V20h-2V8.25L5.9 12.9 4.5 11.5 12 4z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex max-w-[min(100%,520px)] items-center gap-3 rounded-2xl border border-chetya-border/60 bg-chetya-bubble-assistant/90 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chetya-gold/15 text-xs font-medium text-chetya-gold">
        ग
      </div>
      <div className="flex gap-1.5" aria-hidden>
        <span className="chetya-typing-dot inline-block h-2 w-2 rounded-full bg-chetya-muted" />
        <span className="chetya-typing-dot inline-block h-2 w-2 rounded-full bg-chetya-muted" />
        <span className="chetya-typing-dot inline-block h-2 w-2 rounded-full bg-chetya-muted" />
      </div>
    </div>
  );
}

type ChatPageProps = { guest?: boolean };

export function ChatPage({ guest = false }: ChatPageProps) {
  const apis = useMemo(() => speechApisSupported(), []);
  const voiceEnvHint = useMemo(() => voiceEnvironmentWarning(), []);
  const [guestLang, setGuestLang] = useState('en');
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(() =>
    guest || typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(() => {
    if (guest) return false;
    return typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lifeContext, setLifeContext] = useState(() => {
    if (typeof sessionStorage === 'undefined') return '';
    try {
      return sessionStorage.getItem(LIFE_CONTEXT_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [voiceReplyAuto, setVoiceReplyAuto] = useState(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(VOICE_REPLY_KEY) === '1' : false
  );
  const [voiceConvoMode, setVoiceConvoMode] = useState(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(VOICE_CONVO_KEY) === '1' : false
  );
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopListenRef = useRef<(() => void) | null>(null);
  const inputMirrorRef = useRef('');
  const loadingRef = useRef(false);
  const guestExhaustedRef = useRef(false);
  const voiceConvoModeRef = useRef(false);
  const voiceAutosendTimerRef = useRef<number | null>(null);
  const sendLatestRef = useRef<(textOverride?: string) => Promise<void>>(async () => {});
  const authLanguage = useAuthStore((s) => s.language);
  const language = guest ? guestLang : authLanguage;
  const userId = useAuthStore((s) => s.userId);
  const userEmail = useAuthStore((s) => s.email);
  const userInitial = guest ? '?' : (userEmail?.trim()?.charAt(0)?.toUpperCase() ?? '?');

  const [hasSavedChart, setHasSavedChart] = useState<boolean | null>(null);
  const [dailyDismissed, setDailyDismissed] = useState(false);
  const [dailyText, setDailyText] = useState<string | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyErr, setDailyErr] = useState<string | null>(null);

  const guestExhausted = guest && guestRemaining === 0;

  const refreshSessions = useCallback(async () => {
    if (guest) return;
    try {
      const list = await fetchChatSessions();
      setSessions(list);
    } catch {
      /* non-fatal */
    }
  }, [guest]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (guest || !userId || typeof sessionStorage === 'undefined') {
      setDailyDismissed(false);
      return;
    }
    try {
      setDailyDismissed(sessionStorage.getItem(dailyDismissStorageKey(userId)) === '1');
    } catch {
      setDailyDismissed(false);
    }
  }, [guest, userId]);

  const loadDailyGlimpse = useCallback(
    async (force: boolean) => {
      if (guest || !userId) return;
      setDailyErr(null);
      try {
        const me = await fetchMe();
        const hc = !!me.has_saved_chart;
        setHasSavedChart(hc);
        if (!hc) {
          setDailyText(null);
          return;
        }
        const ck = dailyBodyCacheKey(userId, language);
        if (force && typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.removeItem(ck);
          } catch {
            /* ignore */
          }
        }
        if (!force && typeof sessionStorage !== 'undefined') {
          try {
            const cached = sessionStorage.getItem(ck);
            if (cached) {
              setDailyText(cached);
              return;
            }
          } catch {
            /* ignore */
          }
        }
        setDailyLoading(true);
        const text = await fetchDailyReading(userId, language);
        setDailyText(text || null);
        if (text && typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.setItem(ck, text);
          } catch {
            /* quota */
          }
        }
      } catch (e: unknown) {
        setDailyErr(friendlyApiError(e));
        setDailyText(null);
      } finally {
        setDailyLoading(false);
      }
    },
    [guest, userId, language]
  );

  useEffect(() => {
    if (guest || !userId || dailyDismissed) return;
    void loadDailyGlimpse(false);
  }, [guest, userId, dailyDismissed, loadDailyGlimpse]);

  useEffect(() => {
    if (!guest) return;
    let cancelled = false;
    void fetchGuestQuota()
      .then(({ remaining }) => {
        if (!cancelled) setGuestRemaining(remaining);
      })
      .catch(() => {
        if (!cancelled) setGuestRemaining(GUEST_PROMPT_LIMIT);
      });
    return () => {
      cancelled = true;
    };
  }, [guest]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  inputMirrorRef.current = input;
  loadingRef.current = loading;
  voiceConvoModeRef.current = voiceConvoMode;
  guestExhaustedRef.current = guestExhausted;

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    try {
      if (lifeContext.trim()) sessionStorage.setItem(LIFE_CONTEXT_STORAGE_KEY, lifeContext);
      else sessionStorage.removeItem(LIFE_CONTEXT_STORAGE_KEY);
    } catch {
      /* ignore quota */
    }
  }, [lifeContext]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 200)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      stopListenRef.current?.();
      stopListenRef.current = null;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (guest) return;
    const stored =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (!stored) return;
    let cancelled = false;
    setLoadingSession(true);
    void fetchChatMessages(stored)
      .then((msgs) => {
        if (!cancelled && msgs.length) setMessages(msgs);
      })
      .catch(() => {
        if (!cancelled) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setChatSessionId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guest]);

  const persistSessionId = (id: string | null) => {
    setChatSessionId(id);
    if (id) sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const setVoiceReplyPersist = (on: boolean) => {
    setVoiceReplyAuto(on);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(VOICE_REPLY_KEY, on ? '1' : '0');
    if (!on) stopSpeaking();
  };

  const setVoiceConvoPersist = (on: boolean) => {
    setVoiceConvoMode(on);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(VOICE_CONVO_KEY, on ? '1' : '0');
    if (on) {
      setVoiceReplyAuto(true);
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(VOICE_REPLY_KEY, '1');
      void ensureVoicesLoaded();
    }
  };

  const toggleMic = async () => {
    if (!apis.listen) {
      setErr(
        typeof window !== 'undefined' && window.isSecureContext === false
          ? 'Voice needs HTTPS — open this site with https:// (localhost is OK for development).'
          : 'Voice input needs Chrome or Edge (desktop recommended). Firefox does not support web speech-to-text yet.'
      );
      return;
    }
    if (loading) return;
    if (isListening) {
      stopListenRef.current?.();
      stopListenRef.current = null;
      setIsListening(false);
      return;
    }
    setErr(null);
    stopSpeaking();
    if (voiceAutosendTimerRef.current !== null) {
      window.clearTimeout(voiceAutosendTimerRef.current);
      voiceAutosendTimerRef.current = null;
    }
    const primed = await primeMicrophone();
    if (!primed.ok) {
      setErr(primed.message ?? 'Could not access the microphone.');
      return;
    }
    void ensureVoicesLoaded();
    const langTag = bcp47ForAppLanguage(language);
    stopListenRef.current = startListening(langTag, {
      onUpdate: (t) => setInput(t),
      onError: (msg) => {
        setErr(msg);
        setIsListening(false);
        stopListenRef.current = null;
      },
      onEnd: () => {
        setIsListening(false);
        stopListenRef.current = null;
        if (voiceAutosendTimerRef.current !== null) {
          window.clearTimeout(voiceAutosendTimerRef.current);
        }
        voiceAutosendTimerRef.current = window.setTimeout(() => {
          voiceAutosendTimerRef.current = null;
          if (!voiceConvoModeRef.current) return;
          const t = inputMirrorRef.current.trim();
          if (!t || loadingRef.current || guestExhaustedRef.current) return;
          void sendLatestRef.current(t);
        }, 340);
      },
    });
    setIsListening(true);
  };

  const playAssistantLine = (content: string) => {
    if (!apis.speak) {
      setErr('Read-aloud needs a browser that supports speech synthesis.');
      return;
    }
    void speakAloud(content, bcp47ForAppLanguage(language));
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? inputMirrorRef.current).trim();
    if (!text || loading) return;
    if (guest && guestRemaining === 0) return;
    setErr(null);
    stopSpeaking();
    stopListenRef.current?.();
    stopListenRef.current = null;
    setIsListening(false);

    const prevMessages = messages;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    const speakReply = apis.speak && (voiceReplyAuto || voiceConvoMode);
    try {
      if (guest) {
        const res = await sendGuestChat(next, language, lifeContext);
        setMessages([...next, res.message]);
        setGuestRemaining(res.guest_prompts_remaining);
        if (speakReply) void speakAloud(res.message.content, bcp47ForAppLanguage(language));
      } else {
        const res = await sendChat(next, chatSessionId, lifeContext);
        persistSessionId(res.session_id);
        const updated = [...next, res.message];
        setMessages(updated);
        void refreshSessions();
        if (speakReply) void speakAloud(res.message.content, bcp47ForAppLanguage(language));
      }
    } catch (e: unknown) {
      const msg = friendlyApiError(e);
      setErr(msg);
      if (guest) {
        setMessages(prevMessages);
        void fetchGuestQuota()
          .then(({ remaining }) => setGuestRemaining(remaining))
          .catch(() => {});
      } else {
        setMessages(next);
      }
    } finally {
      setLoading(false);
    }
  };

  sendLatestRef.current = send;

  const onLangChange = async (code: string) => {
    if (guest) {
      setGuestLang(code);
      return;
    }
    useAuthStore.getState().setLanguage(code);
    stopSpeaking();
    try {
      await patchLanguage(code);
    } catch {
      /* non-fatal */
    }
  };

  const startNewChat = () => {
    stopSpeaking();
    if (voiceAutosendTimerRef.current !== null) {
      window.clearTimeout(voiceAutosendTimerRef.current);
      voiceAutosendTimerRef.current = null;
    }
    stopListenRef.current?.();
    stopListenRef.current = null;
    setIsListening(false);
    if (!guest) {
      persistSessionId(null);
      setSessionsOpen(false);
    }
    setMessages([]);
    setErr(null);
  };

  const openSession = async (id: string) => {
    persistSessionId(id);
    stopSpeaking();
    setLoadingSession(true);
    setErr(null);
    try {
      const msgs = await fetchChatMessages(id);
      setMessages(msgs);
    } catch {
      setErr('Could not load this conversation.');
    } finally {
      setLoadingSession(false);
      setSessionsOpen(false);
    }
  };

  const showEmpty = messages.length === 0 && !loadingSession;

  const sessionList = (
    <div className="chetya-scroll flex-1 overflow-y-auto p-2">
      {sessions.length === 0 && (
        <p className="px-2 py-4 text-center text-xs leading-relaxed text-chetya-muted">
          Conversations you start will appear here.
        </p>
      )}
      {sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => void openSession(s.id)}
          className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
            s.id === chatSessionId
              ? 'bg-white/[0.08] text-chetya-cream ring-1 ring-white/[0.06]'
              : 'text-chetya-muted hover:bg-white/[0.04] hover:text-chetya-cream'
          }`}
        >
          <span className="line-clamp-2 text-[13px] leading-snug">{s.title}</span>
          {s.updated_at && (
            <span className="mt-1 block text-[11px] text-chetya-muted/80">{formatSessionTime(s.updated_at)}</span>
          )}
        </button>
      ))}
    </div>
  );

  const dismissDailyGlimpse = () => {
    if (!userId || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(dailyDismissStorageKey(userId), '1');
    } catch {
      /* ignore */
    }
    setDailyDismissed(true);
  };

  const showDailyStrip =
    !guest &&
    !!userId &&
    !dailyDismissed &&
    hasSavedChart === true &&
    (dailyLoading || !!dailyErr || !!dailyText);

  return (
    <div className="flex h-full min-h-0 flex-col bg-chetya-bg">
      {/* Top bar — minimal, ChatGPT-like */}
      <header className="flex shrink-0 items-center gap-2 border-b border-chetya-border/60 bg-chetya-bg/85 px-3 py-2 backdrop-blur-md md:px-4">
        {guest ? (
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-xl py-1 text-chetya-muted transition-colors hover:text-chetya-cream"
          >
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" width={32} height={32} />
            <span className="hidden text-xs font-medium sm:inline">Home</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setSessionsOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-chetya-muted transition-colors hover:bg-white/[0.06] hover:text-chetya-cream md:hidden"
            aria-label="Chat history"
          >
            <HistoryIcon className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1 md:text-center">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-chetya-cream md:text-base">
            Talk to Guru
          </h1>
          <p className="hidden text-[11px] text-chetya-muted md:block">
            {guest
              ? `Free trial · ${guestRemaining ?? '…'} / ${GUEST_PROMPT_LIMIT} questions · ${voiceConvoMode ? 'Voice chat: speak, pause — we send & reply aloud' : 'Use mic or type'}`
              : voiceConvoMode
                ? 'Voice chat: tap mic → speak → pause; Guru replies aloud (browser voices)'
                : 'Just you and Guru — turn by turn, grounded in your chart when saved'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {guest && (
            <>
              <span
                className="hidden rounded-full border border-chetya-border/80 bg-chetya-panel/80 px-2 py-1 text-[11px] text-chetya-muted sm:inline"
                title="Free questions remaining"
              >
                {guestRemaining ?? '…'} / {GUEST_PROMPT_LIMIT}
              </span>
              <Link
                to="/"
                className="rounded-xl bg-chetya-gold/15 px-3 py-1.5 text-xs font-semibold text-chetya-gold ring-1 ring-chetya-gold/25 transition-colors hover:bg-chetya-gold/25"
              >
                Sign in
              </Link>
            </>
          )}
          {apis.speak && (
            <button
              type="button"
              onClick={() => setVoiceReplyPersist(!voiceReplyAuto)}
              disabled={voiceConvoMode}
              title={
                voiceConvoMode
                  ? 'Turn off Voice chat first to disable read-aloud'
                  : voiceReplyAuto
                    ? 'Turn off read-aloud'
                    : 'Read Guru replies aloud'
              }
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${
                voiceReplyAuto
                  ? 'bg-chetya-gold/15 text-chetya-gold ring-1 ring-chetya-gold/30'
                  : 'text-chetya-muted hover:bg-white/[0.06] hover:text-chetya-cream'
              }`}
              aria-pressed={voiceReplyAuto}
              aria-label={voiceReplyAuto ? 'Turn off read-aloud' : 'Read replies aloud'}
            >
              <SpeakerIcon className="h-[18px] w-[18px]" />
            </button>
          )}
          {apis.listen && apis.speak && (
            <button
              type="button"
              onClick={() => setVoiceConvoPersist(!voiceConvoMode)}
              title={
                voiceConvoMode
                  ? 'Turn off Voice chat (manual Send again)'
                  : 'Voice chat: after you stop speaking, message sends automatically and Guru replies aloud'
              }
              className={`hidden rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:inline-flex ${
                voiceConvoMode
                  ? 'border-chetya-gold/40 bg-chetya-gold/15 text-chetya-gold'
                  : 'border-chetya-border/80 text-chetya-muted hover:bg-white/[0.05] hover:text-chetya-cream'
              }`}
              aria-pressed={voiceConvoMode}
            >
              Voice chat
            </button>
          )}
          {apis.listen && apis.speak && (
            <button
              type="button"
              onClick={() => setVoiceConvoPersist(!voiceConvoMode)}
              className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-1 sm:hidden ${
                voiceConvoMode
                  ? 'bg-chetya-gold/15 text-chetya-gold ring-1 ring-chetya-gold/30'
                  : 'text-chetya-muted hover:bg-white/[0.06] hover:text-chetya-cream'
              }`}
              aria-label={voiceConvoMode ? 'Turn off voice chat' : 'Turn on voice chat'}
              title="Voice chat: speak, pause — auto-send & hear reply"
            >
              <span className="text-[10px] font-bold leading-none tracking-tight">VC</span>
            </button>
          )}
          <select
            value={language}
            onChange={(e) => void onLangChange(e.target.value)}
            aria-label="Language"
            className="max-w-[100px] cursor-pointer rounded-xl border border-chetya-border/80 bg-chetya-panel/90 py-1.5 pl-2 pr-7 text-xs text-chetya-cream shadow-sm focus:border-chetya-gold focus:outline-none focus:ring-2 focus:ring-chetya-gold/25 md:max-w-none md:text-sm"
          >
            {APP_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          {!guest && (
            <>
              <button
                type="button"
                onClick={() => setSessionsOpen((o) => !o)}
                className="hidden rounded-xl border border-chetya-border/80 px-3 py-1.5 text-xs font-medium text-chetya-muted transition-colors hover:bg-white/[0.05] hover:text-chetya-cream md:inline-flex"
              >
                {sessionsOpen ? 'Hide' : 'History'}
              </button>
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-xl bg-chetya-gold/15 px-3 py-1.5 text-xs font-semibold text-chetya-gold ring-1 ring-chetya-gold/25 transition-colors hover:bg-chetya-gold/25"
              >
                New chat
              </button>
            </>
          )}
          {guest && (
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-xl border border-chetya-border/80 px-3 py-1.5 text-xs font-medium text-chetya-muted transition-colors hover:bg-white/[0.05] hover:text-chetya-cream"
            >
              Clear chat
            </button>
          )}
        </div>
      </header>

      {showDailyStrip && (
        <section
          className="shrink-0 border-b border-chetya-border/50 bg-gradient-to-r from-chetya-gold/[0.07] via-chetya-panel/30 to-transparent px-3 py-3 md:px-4"
          aria-label="Today's glimpse"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chetya-gold/90">
                Today's glimpse
              </p>
              {dailyLoading && !dailyText ? (
                <p className="mt-1 text-sm text-chetya-muted">Pulling today's note from your chart…</p>
              ) : dailyErr ? (
                <p className="mt-1 text-sm text-red-200/90">{dailyErr}</p>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-chetya-cream/95">{dailyText}</p>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-chetya-muted/75">
                Optional rhythm — not a command. Cross-check big choices with real-world facts.
              </p>
            </div>
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end">
              <button
                type="button"
                onClick={() => void loadDailyGlimpse(true)}
                disabled={dailyLoading}
                className="rounded-lg border border-chetya-border/70 px-3 py-1.5 text-xs font-medium text-chetya-cream/90 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={dismissDailyGlimpse}
                className="rounded-lg px-3 py-1.5 text-xs text-chetya-muted transition-colors hover:bg-white/[0.05] hover:text-chetya-cream"
              >
                Hide until tomorrow
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Desktop session rail */}
        {!guest && sessionsOpen && (
          <aside className="chetya-scroll hidden w-[260px] shrink-0 flex-col border-r border-chetya-border/60 bg-chetya-surface/90 md:flex">
            <div className="shrink-0 border-b border-chetya-border/60 px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-chetya-muted">Chats</span>
            </div>
            {sessionList}
          </aside>
        )}

        {/* Mobile: full-screen chat history */}
        {!guest && sessionsOpen && (
          <div className="fixed inset-0 z-40 flex flex-col bg-chetya-bg md:hidden">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-chetya-border/60 px-4">
              <span className="text-sm font-semibold text-chetya-cream">Chat history</span>
              <button
                type="button"
                onClick={() => setSessionsOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-chetya-gold hover:bg-white/[0.06]"
              >
                Done
              </button>
            </div>
            <aside className="chetya-scroll flex min-h-0 flex-1 flex-col bg-chetya-surface">{sessionList}</aside>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="chetya-scroll flex-1 overflow-y-auto">
            {showEmpty && (
              <div className="flex min-h-[min(56vh,520px)] flex-col items-center justify-center px-6 pb-8 pt-6 text-center animate-fade-in-fast">
                <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-chetya-gold/20 via-chetya-panel to-chetya-surface shadow-glass ring-1 ring-white/[0.08]">
                  <span className="text-3xl font-semibold text-chetya-gold" aria-hidden>
                    ॐ
                  </span>
                </div>
                <h2 className="text-[22px] font-semibold tracking-tight text-chetya-cream md:text-2xl">
                  How can I help you today?
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-chetya-muted">
                  {guest
                    ? `You have ${GUEST_PROMPT_LIMIT} free turns in this trial — a direct back-and-forth with Guru; chats aren't saved after you leave. Add the optional situation note so replies fit your life; sign in for chart-grounded depth, voice, and saved threads.`
                    : 'Talk like you would with someone across the table — decisions, timing, doubts. A short situation note below keeps it practical. Save a birth chart reading so Guru can anchor specifics; mic or type.'}
                </p>
              </div>
            )}

            {!showEmpty && (
              <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
                {loadingSession && messages.length === 0 && (
                  <p className="text-sm text-chetya-muted">Loading conversation…</p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}-${m.content.slice(0, 20)}`}
                    className={`chetya-message-enter flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        m.role === 'user'
                          ? 'bg-chetya-bubble-user text-chetya-cream'
                          : 'bg-chetya-gold/15 text-chetya-gold'
                      }`}
                    >
                      {m.role === 'user' ? userInitial : 'ग'}
                    </div>
                    <div
                      className={`min-w-0 max-w-[min(100%,560px)] rounded-2xl px-4 py-3 text-[15px] leading-[1.65] shadow-sm ${
                        m.role === 'user'
                          ? 'bg-chetya-bubble-user text-chetya-cream'
                          : 'border border-chetya-border/50 bg-chetya-bubble-assistant/95 text-chetya-cream/95'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-chetya-muted">
                          {m.role === 'user' ? 'You' : 'Guru'}
                        </span>
                        {m.role === 'assistant' && apis.speak && (
                          <button
                            type="button"
                            onClick={() => playAssistantLine(m.content)}
                            className="rounded-lg p-1.5 text-chetya-gold/80 transition-colors hover:bg-white/[0.06] hover:text-chetya-gold"
                            title="Read aloud"
                            aria-label="Read this reply aloud"
                          >
                            <SpeakerIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chetya-gold/15 text-xs font-medium text-chetya-gold">
                      ग
                    </div>
                    <TypingIndicator />
                  </div>
                )}
                {err && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-red-500/30 bg-red-950/35 px-4 py-3 text-sm text-red-200/95"
                  >
                    {err}
                  </p>
                )}
                <div ref={endRef} className="h-px w-full shrink-0" />
              </div>
            )}
          </div>

          {/* Composer — ChatGPT-style pill */}
          <div className="shrink-0 border-t border-chetya-border/50 bg-gradient-to-t from-chetya-bg via-chetya-bg to-transparent px-3 pb-4 pt-2 md:px-4">
            <div className="mx-auto max-w-3xl">
              {apis.listen && voiceEnvHint && (
                <p className="mb-2 rounded-xl border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
                  {voiceEnvHint}
                </p>
              )}
              <details className="mb-2 rounded-xl border border-white/[0.06] bg-chetya-panel/35 px-3 py-2 text-left backdrop-blur-sm open:border-chetya-border/50">
                <summary className="cursor-pointer select-none text-xs font-medium text-chetya-muted outline-none hover:text-chetya-cream/90 [&::-webkit-details-marker]:hidden">
                  Your situation (optional — helps Guru tailor Plan A / Plan B){' '}
                  {lifeContext.trim() ? (
                    <span className="font-normal text-chetya-gold/80">· saved for this browser</span>
                  ) : null}
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed text-chetya-muted/85">
                  A few lines about work, move, relationship, money pressure, or family — not instead of your chart,
                  but so guidance fits your life. You stay in charge of decisions.
                </p>
                <textarea
                  value={lifeContext}
                  onChange={(e) => setLifeContext(e.target.value.slice(0, 1200))}
                  rows={2}
                  maxLength={1200}
                  disabled={guestExhausted}
                  placeholder="e.g. Interview next week in Bangalore; parents want marriage timeline; tight savings…"
                  className="chetya-scroll mt-2 w-full resize-y rounded-lg border border-chetya-border/50 bg-chetya-bg/80 px-3 py-2 text-[13px] leading-relaxed text-chetya-cream placeholder:text-chetya-muted/40 focus:border-chetya-gold/30 focus:outline-none focus:ring-1 focus:ring-chetya-gold/20 disabled:opacity-50"
                  aria-label="Optional note about your current life situation"
                />
              </details>
              <div className="shadow-composer flex items-end gap-2 rounded-[26px] border border-white/[0.08] bg-chetya-panel/95 p-2 pl-3 backdrop-blur-xl ring-1 ring-black/20 transition-shadow duration-300 focus-within:border-chetya-gold/35 focus-within:ring-2 focus-within:ring-chetya-gold/20">
                {apis.listen && (
                  <button
                    type="button"
                    onClick={() => void toggleMic()}
                    disabled={loading || !apis.listen || guestExhausted}
                    title={apis.listen ? (isListening ? 'Stop listening' : 'Speak') : 'Voice not supported'}
                    aria-pressed={isListening}
                    aria-label={
                      !apis.listen
                        ? 'Voice input not supported in this browser'
                        : isListening
                          ? 'Stop listening'
                          : 'Speak your message'
                    }
                    className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] transition-all duration-200 disabled:opacity-35 ${
                      isListening
                        ? 'chetya-mic-live bg-chetya-gold/20 text-chetya-gold ring-1 ring-chetya-gold/40'
                        : 'text-chetya-muted hover:bg-white/[0.06] hover:text-chetya-cream'
                    }`}
                  >
                    <MicIcon className="h-5 w-5" />
                  </button>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send(undefined);
                    }
                  }}
                  rows={1}
                  placeholder={
                    guestExhausted
                      ? 'Sign in to continue the conversation…'
                      : isListening
                        ? voiceConvoMode
                          ? 'Listening… pause when done — sends automatically'
                          : 'Listening…'
                        : voiceConvoMode && apis.listen
                          ? 'Voice chat on: tap mic, speak, pause — or type here'
                          : 'Message your guru…'
                  }
                  className="chetya-scroll mb-0.5 max-h-[200px] min-h-[44px] flex-1 resize-none border-0 bg-transparent py-2.5 text-[15px] leading-relaxed text-chetya-cream placeholder:text-chetya-muted/45 focus:outline-none focus:ring-0 disabled:opacity-50"
                  disabled={loading || guestExhausted}
                />
                <button
                  type="button"
                  onClick={() => void send(undefined)}
                  disabled={loading || !input.trim() || guestExhausted}
                  aria-label="Send message"
                  className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-chetya-cream text-chetya-bg shadow-md transition-all duration-200 hover:brightness-110 disabled:bg-chetya-border disabled:text-chetya-muted disabled:shadow-none disabled:opacity-40"
                >
                  <SendArrowIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-chetya-muted/70">
                Chetya offers perspective from classical Jyotisha — not guarantees. Cross-check money, health, and legal
                choices with facts and people you trust.
                {guest && (
                  <>
                    {' '}
                    <Link to="/" className="text-chetya-gold/90 underline-offset-2 hover:underline">
                      Sign in
                    </Link>{' '}
                    for saved chats and voice.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
