import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  token: string | null;
  language: string;
  email: string | null;
  userId: string | null;
  setSession: (token: string, language: string, email: string, userId: string) => void;
  setLanguage: (language: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      language: 'en',
      email: null,
      userId: null,
      setSession: (token, language, email, userId) =>
        set({ token, language, email, userId }),
      setLanguage: (language) => set({ language }),
      logout: () => set({ token: null, email: null, userId: null }),
    }),
    { name: 'chetya-web-auth' }
  )
);
