import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User } from '../api/client';
import { setUnauthorizedHandler } from '../api/client';
import * as AuthStorage from '../storage/authStorage';

const TOKEN_KEY = 'ml_jwt';
const USER_KEY = 'ml_user';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  // Restore the session from the platform's asynchronous auth storage on boot.
  useEffect(() => {
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          AuthStorage.getItemAsync(TOKEN_KEY),
          AuthStorage.getItemAsync(USER_KEY),
        ]);
        if (token && userJson) {
          setState({ token, user: JSON.parse(userJson), isLoading: false });
        } else {
          setState({ token: null, user: null, isLoading: false });
        }
      } catch {
        setState({ token: null, user: null, isLoading: false });
      }
    })();
  }, []);

  const signIn = useCallback(async (token: string, user: User) => {
    await Promise.all([
      AuthStorage.setItemAsync(TOKEN_KEY, token),
      AuthStorage.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    setState({ token, user, isLoading: false });
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      AuthStorage.deleteItemAsync(TOKEN_KEY),
      AuthStorage.deleteItemAsync(USER_KEY),
    ]);
    setState({ token: null, user: null, isLoading: false });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { void signOut(); });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

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
