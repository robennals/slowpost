import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthState = {
  isLoggedIn: boolean;
  username?: string;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  username?: string;
  loading: boolean;
  refresh: () => Promise<void>;
  setSession: (state: AuthState) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchSession(): Promise<AuthState> {
  try {
    const response = await fetch('/api/login/session', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Unable to fetch session');
    }
    const data = (await response.json()) as { isLoggedIn?: boolean; username?: string };
    return { isLoggedIn: Boolean(data.isLoggedIn), username: data.username };
  } catch {
    return { isLoggedIn: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ isLoggedIn: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const session = await fetchSession();
    setState(session);
    setLoading(false);
  }, []);

  const setSession = useCallback((value: AuthState) => {
    setState(value);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn: state.isLoggedIn,
      username: state.username,
      loading,
      refresh,
      setSession
    }),
    [loading, refresh, setSession, state.isLoggedIn, state.username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
