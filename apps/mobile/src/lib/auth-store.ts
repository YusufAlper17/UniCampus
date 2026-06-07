import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    set({ accessToken, refreshToken, hydrated: true });
  },

  setSession: async ({ accessToken, refreshToken, user }) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken, user: user ?? get().user });
  },

  setAccessToken: (accessToken) => {
    void SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    set({ accessToken });
  },

  signOut: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
