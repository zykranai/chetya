import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    {
      name: 'chetya-auth-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        token: s.token,
        language: s.language,
        email: s.email,
        userId: s.userId,
      }),
    }
  )
);
