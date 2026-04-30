import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

/** Dev: use Vite proxy `/api` → FastAPI. Prod: set VITE_API_URL to full backend origin. */
const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000');

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
  message: ChatMessage;
  session_id: string;
};

export async function sendChat(messages: ChatMessage[], sessionId?: string | null) {
  const { data } = await api.post<ChatResponse>('/chat', {
    messages,
    session_id: sessionId || undefined,
  });
  return data;
}

export type ChatSessionSummary = { id: string; title: string; updated_at: string | null };

export async function fetchChatSessions() {
  const { data } = await api.get<{ sessions: ChatSessionSummary[] }>('/chat/sessions');
  return data.sessions;
}

export async function fetchChatMessages(sessionId: string) {
  const { data } = await api.get<{ messages: ChatMessage[] }>(
    `/chat/sessions/${encodeURIComponent(sessionId)}/messages`
  );
  return data.messages;
}

export async function generateReading(body: ReadingRequest) {
  const res = await api.post<{ success: boolean; data: Record<string, unknown> }>(
    '/reading/generate',
    body
  );
  return res.data;
}
