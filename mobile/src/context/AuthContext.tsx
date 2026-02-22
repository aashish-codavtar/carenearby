import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Storage, StoredUser } from '../utils/storage';

interface AuthState {
  token: string | null;
  user: StoredUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, user: StoredUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  // Rehydrate from AsyncStorage on mount
  useEffect(() => {
    // Request persistent storage on web so the browser never evicts auth data when the tab is closed
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist();
    }
    (async () => {
      const [token, user] = await Promise.all([Storage.getToken(), Storage.getUser()]);
      setState({ token, user, isLoading: false });
    })();
  }, []);

  const signIn = useCallback(async (token: string, user: StoredUser) => {
    await Storage.saveAuth(token, user);
    setState({ token, user, isLoading: false });
  }, []);

  const signOut = useCallback(async () => {
    await Storage.clearAuth();
    setState({ token: null, user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
