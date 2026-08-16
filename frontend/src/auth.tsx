import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// Détecte si Supabase est vraiment configuré (pas les placeholders par défaut)
const IS_SUPABASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !process.env.EXPO_PUBLIC_SUPABASE_URL.includes("VOTRE") &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes("VOTRE");
const LOCAL_DEMO_AUTH_ENABLED = process.env.EXPO_PUBLIC_ENABLE_LOCAL_DEMO_AUTH === "true";

type User = {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  avatar?: string | null;
  created_at: string;
  verified?: boolean;
  kyc_status?: "none" | "pending" | "verified" | "rejected";
  kyc_source?: string;
  referral_code?: string;
  credit_balance?: number;
  referred_by?: string | null;
  contact_verified_at?: string | null;
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, referral_code?: string) => Promise<void>;
  requestOtp: (email: string, phone: string, name?: string) => Promise<{ devCode?: string | null; delivery?: any }>;
  verifyOtp: (email: string, phone: string, code: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function toUser(u: any, meta: any): User {
  return {
    id: u.id,
    email: u.email ?? "",
    name: meta?.name ?? meta?.full_name ?? u.email?.split("@")[0] ?? "Utilisateur",
    avatar: meta?.avatar_url ?? null,
    created_at: u.created_at ?? new Date().toISOString(),
  };
}

// ── Persistance web + comptes démo locaux ─────────────────────
const MOCK_TOKEN_KEY = "ls_mock_token";
const MOCK_USER_KEY  = "ls_mock_user";
const MOCK_USERS_KEY = "ls_mock_users";

type LocalStoredUser = User & { password: string };

function mockSave(token: string, user: User) {
  if (canUseWebStorage()) {
    localStorage.setItem(MOCK_TOKEN_KEY, token);
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  }
}

function mockLoad(): { token: string; user: User } | null {
  if (canUseWebStorage()) {
    const token = localStorage.getItem(MOCK_TOKEN_KEY);
    const raw   = localStorage.getItem(MOCK_USER_KEY);
    if (token && raw) {
      try { return { token, user: JSON.parse(raw) }; } catch {}
    }
  }
  return null;
}

function mockClear() {
  if (canUseWebStorage()) {
    localStorage.removeItem(MOCK_TOKEN_KEY);
    localStorage.removeItem(MOCK_USER_KEY);
  }
}

function canUseWebStorage() {
  return Platform.OS === "web" && typeof localStorage !== "undefined";
}

function canUseLocalAuthFallback() {
  return LOCAL_DEMO_AUTH_ENABLED && canUseWebStorage();
}

function localUsers(): LocalStoredUser[] {
  if (!canUseLocalAuthFallback()) return [];
  const raw = localStorage.getItem(MOCK_USERS_KEY);
  const base: LocalStoredUser[] = [
    {
      id: "demo-local",
      email: "demo@locashare.fr",
      phone: "+33600000000",
      password: "demo1234",
      name: "Alexandre D.",
      avatar: null,
      created_at: "2024-01-01T00:00:00.000Z",
      verified: true,
      kyc_status: "verified",
      kyc_source: "email_phone_otp",
      contact_verified_at: "2024-01-01T00:00:00.000Z",
    },
  ];
  if (!raw) return base;
  try {
    const stored = JSON.parse(raw) as LocalStoredUser[];
    return [...base, ...stored.filter((u) => u.email !== "demo@locashare.fr")];
  } catch {
    return base;
  }
}

function saveLocalUsers(users: LocalStoredUser[]) {
  if (!canUseLocalAuthFallback()) return;
  localStorage.setItem(
    MOCK_USERS_KEY,
    JSON.stringify(users.filter((u) => u.email !== "demo@locashare.fr"))
  );
}

function localToken(email: string) {
  return `local_demo_${email}_${Date.now()}`;
}

function userFromAuthPayload(data: any, fallback: Partial<User> = {}): User {
  return {
    id:             data.user?.id ?? fallback.id ?? "mock_id",
    email:          data.user?.email ?? fallback.email ?? "",
    phone:          data.user?.phone ?? fallback.phone ?? null,
    name:           data.user?.name ?? fallback.name ?? data.user?.nom ?? "Utilisateur",
    avatar:         data.user?.avatar ?? fallback.avatar ?? null,
    created_at:     data.user?.created_at ?? fallback.created_at ?? new Date().toISOString(),
    verified:       data.user?.verified ?? fallback.verified ?? false,
    kyc_status:     data.user?.kyc_status ?? fallback.kyc_status ?? "none",
    kyc_source:     data.user?.kyc_source ?? fallback.kyc_source,
    referral_code:  data.user?.referral_code ?? fallback.referral_code,
    credit_balance: data.user?.credit_balance ?? fallback.credit_balance,
    referred_by:    data.user?.referred_by ?? fallback.referred_by,
    contact_verified_at: data.user?.contact_verified_at ?? fallback.contact_verified_at ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const saveAuthSession = (authToken: string, nextUser: User) => {
    mockSave(authToken, nextUser);
    setToken(authToken);
    setUser(nextUser);
  };

  useEffect(() => {
    if (IS_SUPABASE_CONFIGURED) {
      // ── Mode Supabase ──
      supabase.auth.getSession().then(({ data }) => {
        const session = data.session;
        if (session) {
          setToken(session.access_token);
          setUser(toUser(session.user, session.user.user_metadata));
        }
        setLoading(false);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setToken(session.access_token);
          setUser(toUser(session.user, session.user.user_metadata));
        } else {
          setToken(null);
          setUser(null);
        }
      });

      return () => listener.subscription.unsubscribe();
    } else {
      // ── Mode backend Toupré ──
      const saved = mockLoad();
      if (saved) {
        setToken(saved.token);
        setUser(saved.user);
      }
      setLoading(false);
    }
  }, []);

  // ── Login ────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    if (IS_SUPABASE_CONFIGURED) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return;
    }

    try {
      const res  = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Identifiants incorrects.");

      const u = userFromAuthPayload(data, { email, name: email.split("@")[0] });
      const authToken = data.access_token ?? data.token;
      saveAuthSession(authToken, u);
    } catch (error: any) {
      if (!canUseLocalAuthFallback() || error?.message === "Identifiants incorrects.") throw error;
      const found = localUsers().find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (!found) throw new Error("Identifiants incorrects.");
      const { password: _password, ...u } = found;
      const authToken = localToken(u.email);
      saveAuthSession(authToken, u);
    }
  };

  // ── Register ─────────────────────────────────────────────────
  const register = async (email: string, password: string, name: string, referral_code?: string) => {
    if (IS_SUPABASE_CONFIGURED) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, referral_code } },
      });
      if (error) throw new Error(error.message);
      return;
    }

    try {
      const res  = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, referral_code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Erreur lors de la création du compte.");

      const u = userFromAuthPayload(data, { email, name });
      const authToken = data.access_token ?? data.token;
      saveAuthSession(authToken, u);
    } catch (error: any) {
      if (!canUseLocalAuthFallback()) throw error;
      const normalizedEmail = email.trim().toLowerCase();
      const users = localUsers();
      if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        throw new Error("Cet email est déjà utilisé.");
      }
      const u: User = {
        id: `local_${Date.now()}`,
        email: normalizedEmail,
        name,
        avatar: null,
        created_at: new Date().toISOString(),
      };
      saveLocalUsers([...users, { ...u, password }]);
      const authToken = localToken(u.email);
      saveAuthSession(authToken, u);
    }
  };

  const requestOtp = async (email: string, phone: string, name?: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Impossible d'envoyer le code.");
    return { devCode: data._dev_code ?? null, delivery: data.delivery };
  };

  const verifyOtp = async (email: string, phone: string, code: string, name?: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, code, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Code incorrect.");
    const u = userFromAuthPayload(data, { email, phone, name: name || email.split("@")[0] });
    const authToken = data.access_token ?? data.token;
    saveAuthSession(authToken, u);
  };

  // ── Google OAuth ─────────────────────────────────────────────
  const loginWithGoogle = async () => {
    if (!IS_SUPABASE_CONFIGURED) {
      throw new Error("Connexion Google non disponible en mode démo.");
    }
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
      return;
    }
    const redirectUrl = Linking.createURL("auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });
    if (error) throw new Error(error.message);
    if (!data.url) return;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === "success") {
      const parsed = Linking.parse(result.url);
      const params = parsed.queryParams as Record<string, string>;
      if (params.code) await supabase.auth.exchangeCodeForSession(result.url);
    }
  };

  // ── Apple Sign In ─────────────────────────────────────────────
  const loginWithApple = async () => {
    if (!IS_SUPABASE_CONFIGURED) {
      throw new Error("Connexion Apple non disponible en mode démo.");
    }
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
      return;
    }
    try {
      const AppleAuth = await import("expo-apple-authentication");
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple: token manquant");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: credential.authorizationCode ?? undefined,
      });
      if (error) throw new Error(error.message);
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") throw e;
    }
  };

  // ── Refresh user (après KYC validé, par exemple) ────────────
  const refreshUser = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return;
      const data = await r.json();
      const u: User = {
        id:            data.id || user?.id || "",
        email:         data.email || user?.email || "",
        name:          data.name || user?.name || "",
        avatar:        data.avatar ?? user?.avatar ?? null,
        created_at:    data.created_at ?? user?.created_at ?? new Date().toISOString(),
        ...((data as any) || {}),
      };
      setUser(u);
      mockSave(token || "", u);
    } catch {}
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    if (IS_SUPABASE_CONFIGURED) {
      await supabase.auth.signOut();
    } else {
      mockClear();
      setToken(null);
      setUser(null);
    }
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, requestOtp, verifyOtp, loginWithGoogle, loginWithApple, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

// ── apiFetch ─────────────────────────────────────────────────
export class ApiError extends Error {
  code?: string;
  action?: string;
  reasons?: string[];
  status?: number;
  constructor(message: string, opts: { code?: string; action?: string; reasons?: string[]; status?: number } = {}) {
    super(message);
    this.code = opts.code;
    this.action = opts.action;
    this.reasons = opts.reasons;
    this.status = opts.status;
  }
}

export async function apiFetch(path: string, opts: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === "object" && err.detail ? err.detail : err;
    throw new ApiError(
      typeof err.detail === "string" ? err.detail : detail.detail || `Erreur ${res.status}`,
      {
        code: detail.code || err.code,
        action: detail.action || err.action,
        reasons: detail.reasons || err.reasons,
        status: res.status,
      },
    );
  }
  return res.json();
}
