"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types";
import { ApiError, authApi, TOKEN_KEY, UNAUTHORIZED_EVENT } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Validates a saved token with the server and returns its user, if any. */
async function restoreSession(): Promise<User | null> {
  if (!localStorage.getItem(TOKEN_KEY)) return null;
  try {
    const res = await authApi.getMe();
    return res.data?.user ?? null;
  } catch (error) {
    // Only forget the token if the server rejected it — a network blip shouldn't sign you out
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;
    restoreSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client fires this when any request comes back 401 (expired/invalid token)
  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const startSession = useCallback((data?: { user: User; token: string }) => {
    if (!data) throw new ApiError(500, "Unexpected response from server.");
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => startSession((await authApi.login({ email, password })).data),
    [startSession]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) =>
      startSession((await authApi.signup({ name, email, password })).data),
    [startSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
