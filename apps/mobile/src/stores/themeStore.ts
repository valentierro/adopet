import { create } from 'zustand';
import { getThemePreference, setThemePreference, type ThemePreference } from '../storage/themePreference';

type ThemeState = {
  preference: ThemePreference | null;
  hydrated: boolean;
  setPreference: (value: ThemePreference | null) => void;
  hydrate: () => Promise<void>;
  setAndPersist: (value: ThemePreference) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: null,
  hydrated: false,

  setPreference: (value) => set({ preference: value }),

  hydrate: async () => {
    const p = await getThemePreference();
    set({ preference: p, hydrated: true });
  },

  setAndPersist: async (value) => {
    await setThemePreference(value);
    set({ preference: value });
  },
}));
