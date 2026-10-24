import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { type AuthApi, createAuthApi } from "../api/auth";
import { createApiClient } from "../api/client";
import type { User } from "../api/types";
import { clearSession, loadSession, type Session, type SessionStorage, saveSession } from "./session";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  /** True after the server rejected the token, until the next login; the login page says so. */
  sessionExpired: boolean;
  /** Signs in. Rejects with the API's error (such as wrong credentials) and stays signed out. */
  login(email: string, password: string): Promise<void>;
  /** Creates a regular account and signs in with it. */
  register(email: string, password: string): Promise<void>;
  logout(): void;
  /** For the API client: the server rejected the token, so end the session and say why. */
  expireSession(): void;
  /** The current token, read at call time so a request made right after login already has it. */
  getToken(): string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** localStorage, or a stand-in that remembers nothing where the browser refuses access to it. */
function browserStorage(): SessionStorage {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  }
}

interface AuthProviderProps {
  children: ReactNode;
  /** Injected in tests; by default talks to the real API. */
  authApi?: AuthApi;
  storage?: SessionStorage;
  now?: () => number;
}

export function AuthProvider({ children, authApi, storage: storageProp, now = Date.now }: AuthProviderProps) {
  // Chosen once: a fresh stand-in on every render would change every callback below, and with it
  // everything that depends on them, such as the API client.
  const storage = useMemo(() => storageProp ?? browserStorage(), [storageProp]);
  const api = useMemo(
    () => authApi ?? createAuthApi(createApiClient({ getToken: () => null, onUnauthorized: () => undefined })),
    [authApi],
  );

  const [session, setSession] = useState<Session | null>(() => loadSession(storage, now()));
  const [sessionExpired, setSessionExpired] = useState(false);
  // Mirrors the state so getToken() can answer synchronously, between setSession and the next render.
  const tokenRef = useRef(session?.token ?? null);

  const startSession = useCallback(
    (next: Session) => {
      tokenRef.current = next.token;
      saveSession(storage, next);
      setSession(next);
      setSessionExpired(false);
    },
    [storage],
  );

  const endSession = useCallback(() => {
    tokenRef.current = null;
    clearSession(storage);
    setSession(null);
  }, [storage]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user } = await api.login(email, password);
      startSession({ token, user });
    },
    [api, startSession],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password);
      await login(email, password);
    },
    [api, login],
  );

  const logout = useCallback(() => {
    endSession();
    setSessionExpired(false);
  }, [endSession]);

  const expireSession = useCallback(() => {
    if (tokenRef.current === null) return; // already signed out: a late response must not announce an expiry
    endSession();
    setSessionExpired(true);
  }, [endSession]);

  const getToken = useCallback(() => tokenRef.current, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAdmin: session?.user.role === "ADMIN",
      sessionExpired,
      login,
      register,
      logout,
      expireSession,
      getToken,
    }),
    [session, sessionExpired, login, register, logout, expireSession, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider");
  return value;
}
