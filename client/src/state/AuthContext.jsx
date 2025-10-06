import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiClient, setAuthToken } from "../api/client.js";

const AUTH_STORAGE_KEY = "hft_auth";

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshProfile: async () => {}
});

function persistSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearPersistedSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        setToken(parsed.token);
        setAuthToken(parsed.token);
        fetchProfile(parsed.token).catch(() => {
          logout();
        });
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to parse auth session", err);
      clearPersistedSession();
      setLoading(false);
    }
  }, []);

  async function fetchProfile(activeToken) {
    try {
      const { data } = await apiClient.get("/auth/me", {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : undefined
      });
      setUser(data.user);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch profile", err);
      setError("Unable to load profile");
      setLoading(false);
      throw err;
    }
  }

  async function login(credentials) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/login", credentials);
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      persistSession({ token: data.token });
      setLoading(false);
      return data.user;
    } catch (err) {
      console.error("Login failed", err);
      setError(err.response?.data?.message ?? "Login failed");
      setLoading(false);
      throw err;
    }
  }

  async function register(payload) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/register", payload);
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      persistSession({ token: data.token });
      setLoading(false);
      return data.user;
    } catch (err) {
      console.error("Registration failed", err);
      setError(err.response?.data?.message ?? "Registration failed");
      setLoading(false);
      throw err;
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    clearPersistedSession();
    setLoading(false);
  }

  async function refreshProfile() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await fetchProfile(token);
    } catch (err) {
      logout();
    }
  }

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, logout, refreshProfile }),
    [user, token, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
