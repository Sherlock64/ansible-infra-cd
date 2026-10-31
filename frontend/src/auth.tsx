import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

interface Session {
  authenticated: boolean;
  user?: { username: string; is_staff: boolean };
}

interface AuthState {
  loading: boolean;
  session: Session;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session>({ authenticated: false });

  useEffect(() => {
    api<Session>("/auth/session/")
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setSession(await api<Session>("/auth/login/", { method: "POST", body: { username, password } }));
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/session/", { method: "DELETE" });
    setSession({ authenticated: false });
  }, []);

  return <AuthContext.Provider value={{ loading, session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
