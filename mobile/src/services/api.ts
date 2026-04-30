import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ReadingRequest {
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
  user_id?: string;
  prior_context?: Record<string, unknown>;
}

export async function authWithEmail(email: string, language: string) {
  const res = await api.post<{
    success: boolean;
    access_token: string;
    user_id: string;
  }>('/auth/email', { email, language });
  const { access_token, user_id } = res.data;
  useAuthStore.getState().setSession(access_token, language, email, user_id);
  return res.data;
}

export async function patchLanguage(language: string) {
  const res = await api.patch<{ access_token?: string; language: string }>('/me/language', {
    language,
  });
  if (res.data.access_token) {
    const s = useAuthStore.getState();
    s.setSession(res.data.access_token, language, s.email || '', s.userId || '');
  } else {
    useAuthStore.getState().setLanguage(language);
  }
  return res.data;
}

export async function fetchMe() {
  const res = await api.get('/me');
  return res.data;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[]) {
  const res = await api.post<{ success: boolean; message: ChatMessage }>('/chat', {
    messages,
  });
  return res.data.message;
}

export const generateReading = async (request: ReadingRequest) => {
  const response = await api.post('/reading/generate', request);
  return response.data;
};

export const getDailyReading = async (userId: string) => {
  const response = await api.get(`/reading/daily/${userId}`);
  return response.data;
};
