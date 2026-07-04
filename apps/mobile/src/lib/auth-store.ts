import { create } from 'zustand';
import { USE_MOCK } from './api.js';
import { appStorage } from './storage.js';

const ACCESS_KEY = 'uc_access_token';
const REFRESH_KEY = 'uc_refresh_token';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (params: {
    accessToken: string;
    refreshToken: string;
    user?: SessionUser;
  }) => Promise<void>;
  setAccessToken: (token: string) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      appStorage.getItemAsync(ACCESS_KEY),
      appStorage.getItemAsync(REFRESH_KEY),
    ]);
    // Demo modu: oturum yoksa otomatik giriş yap (uygulama doğrudan akışla açılsın).
    if (USE_MOCK && !accessToken) {
      set({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        user: { id: 'u_me', username: 'yusufalper', displayName: 'Yusuf Alper' },
        hydrated: true,
      });
      return;
    }
    set({ accessToken, refreshToken, hydrated: true });
  },

  setSession: async ({ accessToken, refreshToken, user }) => {
    await Promise.all([
      appStorage.setItemAsync(ACCESS_KEY, accessToken),
      appStorage.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken, user: user ?? get().user });
  },

  setAccessToken: (accessToken) => {
    void appStorage.setItemAsync(ACCESS_KEY, accessToken);
    set({ accessToken });
  },

  signOut: async () => {
    await Promise.all([
      appStorage.deleteItemAsync(ACCESS_KEY),
      appStorage.deleteItemAsync(REFRESH_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
