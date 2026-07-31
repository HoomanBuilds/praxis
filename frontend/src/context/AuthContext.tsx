import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  ssoLogin: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, token: null, login: async () => {}, ssoLogin: () => {}, logout: () => {}, isAuthenticated: false });

const STORAGE_KEY = "praxis_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("praxis_token"));

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("praxis_token", data.access_token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("praxis_token");
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const ssoLogin = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem("praxis_token", token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setToken(token);
    setUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, ssoLogin, logout, isAuthenticated: Boolean(user && token) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
