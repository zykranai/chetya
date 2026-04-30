import axios, { type AxiosInstance, isAxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

/**
 * Production API origin. Set `VITE_API_URL` at build time (e.g. Cloudflare Pages).
 * If unset in production, falls back to the project’s default Render API so static
 * hosting never POSTs to the Pages origin (which returns 405).
 */
function resolveApiBaseURL(): string {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') ?? '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  return 'https://chetya.onrender.com';
}

export const API_BASE_URL = resolveApiBaseURL();

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

/** Anonymous trial chat — no Bearer token (uses X-Chetya-Guest-Id). */
export const guestApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

const GUEST_STORAGE_KEY = 'chetya_guest_id';

export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export const GUEST_PROMPT_LIMIT = 6;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (!isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }
    const cfg = error.config;
    const url = typeof cfg?.url === 'string' ? cfg.url : '';
    if (url.includes('/auth/email')) {
      return Promise.reject(error);
    }
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const publicRoute = path === '/' || path === '/try' || path === '/login';
      if (!publicRoute) {
        window.location.assign('/');
      }
    }
    return Promise.reject(error);
  }
);

export type ReadingRequest = {
  name: string;
  dob: string;
  tob: string;
  place: string;
  age: number;
  location_type: 'home' | 'away' | 'abroad';
  financial_situation: string;
  financial_level: 'low' | 'medium' | 'high';
  main_concern: string;
  specific_question?: string;
  language: string;
  current_city?: string;
};

export async function authWithEmail(email: string, language: string) {
  const { data } = await api.post<{
    access_token: string;
    user_id: string;
  }>('/auth/email', { email, language });
  useAuthStore.getState().setSession(data.access_token, language, email, data.user_id);
  return data;
}

export async function patchLanguage(language: string) {
  const { data } = await api.patch<{ access_token?: string; language: string }>('/me/language', {
    language,
  });
  const s = useAuthStore.getState();
  if (data.access_token)
    s.setSession(data.access_token, language, s.email || '', s.userId || '');
  else s.setLanguage(language);
  return data;
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type ChatResponse = {
  success?: boolean;
  message: ChatMessage;
  session_id: string;
};

export async function sendChat(
  messages: ChatMessage[],
  sessionId?: string | null,
  lifeContext?: string | null
) {
  const { data } = await api.post<ChatResponse>('/chat', {
    messages,
    session_id: sessionId || undefined,
    life_context: lifeContext?.trim() || undefined,
  });
  return data;
}

export type GuestChatResponse = {
  success?: boolean;
  message: ChatMessage;
  session_id: null;
  guest_prompts_remaining: number;
};

export async function fetchGuestQuota(): Promise<{ remaining: number; limit: number }> {
  const guestId = getOrCreateGuestId();
  const { data } = await guestApi.get<{
    guest_prompts_remaining: number;
    guest_prompt_limit: number;
  }>('/guest/quota', {
    headers: { 'X-Chetya-Guest-Id': guestId },
  });
  return { remaining: data.guest_prompts_remaining, limit: data.guest_prompt_limit };
}

export async function sendGuestChat(
  messages: ChatMessage[],
  language: string,
  lifeContext?: string | null
) {
  const guestId = getOrCreateGuestId();
  const { data } = await guestApi.post<GuestChatResponse>(
    '/chat/guest',
    { messages, language, life_context: lifeContext?.trim() || undefined },
    { headers: { 'X-Chetya-Guest-Id': guestId } }
  );
  return data;
}

export type ChatSessionSummary = { id: string; title: string; updated_at: string | null };

export async function fetchChatSessions() {
  const { data } = await api.get<{ sessions?: ChatSessionSummary[] }>('/chat/sessions');
  return data.sessions ?? [];
}

export async function fetchChatMessages(sessionId: string) {
  const { data } = await api.get<{ messages?: ChatMessage[] }>(
    `/chat/sessions/${encodeURIComponent(sessionId)}/messages`
  );
  return data.messages ?? [];
}

export async function generateReading(body: ReadingRequest) {
  const res = await api.post<{ success: boolean; data: Record<string, unknown> }>(
    '/reading/generate',
    body
  );
  return res.data;
}
