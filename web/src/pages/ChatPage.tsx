import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  patchLanguage,
  sendChat,
  fetchChatSessions,
  fetchChatMessages,
  type ChatMessage,
  type ChatSessionSummary,
} from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { APP_LANGUAGES } from '@/constants/languages';
import {
  bcp47ForAppLanguage,
  speechApisSupported,
  startListening,
  speakAloud,
  stopSpeaking,
} from '@/lib/voice';

const SESSION_STORAGE_KEY = 'chetya_chat_session';
const VOICE_REPLY_KEY = 'chetya_voice_reply_auto';

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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-chetya-border bg-chetya-panel px-4 py-3">
      <span className="text-xs text-chetya-muted">Guru is reflecting</span>
      <div className="flex gap-1.5" aria-hidden>
        <span className="chetya-typing-dot inline-block h-2 w-2 rounded-full bg-chetya-gold/80" />
        <span className="chetya-typing-dot inline-block h-2 w-2 rounded-full bg-chetya-gold/80" />
        <span className="chetya-typing-dot inline-block h-2 w-2 rounded-full bg-chetya-gold/80" />
      </div>
    </div>
  );
}

export function ChatPage() {
  const apis = useMemo(() => speechApisSupported(), []);
  const [chatSessionId, setChatSessionId] = useState<string | null>(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null
  );
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceReplyAuto, setVoiceReplyAuto] = useState(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(VOICE_REPLY_KEY) === '1' : false
  );
  const endRef = useRef<HTMLDivElement>(null);
  const stopListenRef = useRef<(() => void) | null>(null);
  const language = useAuthStore((s) => s.language);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await fetchChatSessions();
      setSessions(list);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      stopListenRef.current?.();
      stopListenRef.current = null;
      stopSpeaking();
    };
  }, []);

  /** Restore last thread once after load */
  useEffect(() => {
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
  }, []);

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

  const toggleMic = () => {
    if (!apis.listen) {
      setErr('Voice input needs Chrome / Edge / Safari (desktop) with microphone access.');
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
      },
    });
    setIsListening(true);
  };

  const playAssistantLine = (content: string) => {
    if (!apis.speak) {
      setErr('Read-aloud needs a browser that supports speech synthesis.');
      return;
    }
    speakAloud(content, bcp47ForAppLanguage(language));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setErr(null);
    stopSpeaking();
    stopListenRef.current?.();
    stopListenRef.current = null;
    setIsListening(false);

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChat(next, chatSessionId);
      persistSessionId(res.session_id);
      const updated = [...next, res.message];
      setMessages(updated);
      void refreshSessions();
      if (voiceReplyAuto && apis.speak) speakAloud(res.message.content, bcp47ForAppLanguage(language));
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } }; message?: string };
      setErr(ax.response?.data?.detail || ax.message || 'Request failed');
      setMessages([
        ...next,
        {
          role: 'assistant',
          content:
            'Could not reach the guru. Is the API running? (Use Vite proxy `/api` or set VITE_API_URL.)',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onLangChange = async (code: string) => {
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
    stopListenRef.current?.();
    stopListenRef.current = null;
    setIsListening(false);
    persistSessionId(null);
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
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="relative shrink-0 overflow-hidden border-b border-chetya-border px-4 py-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background:
              'radial-gradient(ellipse 80% 120% at 100% 0%, rgba(201,162,39,0.25) 0%, transparent 55%), radial-gradient(ellipse 60% 80% at 0% 100%, rgba(45,74,111,0.35) 0%, transparent 50%)',
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-chetya-cream">Talk to Guru</h1>
            <p className="mt-0.5 text-xs text-chetya-muted">
              Voice or text — replies sound human and chart-grounded. Save a reading first for full depth.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {apis.speak && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-chetya-border bg-chetya-panel/80 px-2 py-1.5 text-xs text-chetya-muted hover:text-chetya-cream">
                <input
                  type="checkbox"
                  checked={voiceReplyAuto}
                  onChange={(e) => setVoiceReplyPersist(e.target.checked)}
                  className="accent-chetya-gold"
                />
                <SpeakerIcon className="h-4 w-4 text-chetya-gold/90" />
                <span>Read replies aloud</span>
              </label>
            )}
            <label className="text-xs text-chetya-muted">Language</label>
            <select
              value={language}
              onChange={(e) => void onLangChange(e.target.value)}
              className="rounded-lg border border-chetya-border bg-chetya-panel px-2 py-1.5 text-sm text-chetya-cream"
            >
              {APP_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSessionsOpen((o) => !o)}
              className="rounded-lg border border-chetya-border px-3 py-1.5 text-sm text-chetya-muted hover:bg-chetya-border/40 hover:text-chetya-cream"
            >
              {sessionsOpen ? 'Hide history' : 'History'}
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-lg border border-chetya-gold/40 bg-chetya-gold/10 px-3 py-1.5 text-sm font-medium text-chetya-gold hover:bg-chetya-gold/20"
            >
              New chat
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sessionsOpen && (
          <aside className="hidden w-56 shrink-0 flex-col border-r border-chetya-border bg-chetya-panel/80 md:flex">
            <div className="border-b border-chetya-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-chetya-muted">
              Recent
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 && (
                <p className="px-2 py-3 text-xs text-chetya-muted">No saved threads yet.</p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void openSession(s.id)}
                  className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    s.id === chatSessionId
                      ? 'bg-chetya-border/60 text-chetya-cream'
                      : 'text-chetya-muted hover:bg-chetya-border/30 hover:text-chetya-cream'
                  }`}
                >
                  <span className="line-clamp-2">{s.title}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-chetya-muted">
              Tap the mic to speak; tap again when you’re done. Use “Read replies aloud” for a gentle voice read-back.
              Each guru message has a listen button if you want to hear it again.
            </p>
            <div className="mx-auto mt-6 max-w-3xl space-y-4">
              {loadingSession && messages.length === 0 && (
                <p className="text-sm text-chetya-muted">Loading conversation…</p>
              )}
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}-${m.content.slice(0, 12)}`}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-[#2d4a6f] text-chetya-cream'
                        : 'border border-chetya-border bg-gradient-to-br from-chetya-panel to-[#1a1a22] text-chetya-cream/95'
                    }`}
                  >
                    <span className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide opacity-50">
                      <span>{m.role === 'user' ? 'You' : 'Guru'}</span>
                      {m.role === 'assistant' && apis.speak && (
                        <button
                          type="button"
                          onClick={() => playAssistantLine(m.content)}
                          className="rounded-md p-1 text-chetya-gold opacity-70 hover:bg-chetya-border/50 hover:opacity-100"
                          title="Read this reply aloud"
                          aria-label="Read this reply aloud"
                        >
                          <SpeakerIcon className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              )}
              {err && <p className="text-sm text-red-300">{err}</p>}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-chetya-border bg-chetya-bg/95 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-3xl gap-2">
              <button
                type="button"
                onClick={toggleMic}
                disabled={loading || !apis.listen}
                title={apis.listen ? (isListening ? 'Stop listening' : 'Speak your message') : 'Voice not supported'}
                aria-pressed={isListening}
                className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border text-chetya-cream transition-colors disabled:opacity-35 ${
                  isListening
                    ? 'chetya-mic-live border-chetya-gold bg-chetya-gold/20 text-chetya-gold'
                    : 'border-chetya-border bg-chetya-panel hover:border-chetya-gold/50 hover:bg-chetya-border/30'
                }`}
              >
                <MicIcon className="h-6 w-6" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder={isListening ? 'Listening… speak naturally' : 'Type or tap the mic…'}
                className="min-h-[48px] flex-1 resize-none rounded-xl border border-chetya-border bg-chetya-panel px-4 py-3 text-chetya-cream placeholder:text-chetya-muted/50 focus:border-chetya-gold focus:outline-none focus:ring-1 focus:ring-chetya-gold"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="self-end rounded-xl bg-chetya-gold px-5 py-3 font-semibold text-chetya-bg hover:brightness-110 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
