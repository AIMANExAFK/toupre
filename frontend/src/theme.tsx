import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "light" | "dark" | "system";

type Palette = {
  primary: string;
  /** Encre des zones sombres (en-têtes, barre d'onglets) et texte posé dessus. */
  ink: string;
  onInk: string;
  onInkMuted: string;
  primaryLight: string;
  primaryDark: string;
  primaryTint: string;
  primaryGlow: string;
  secondary: string;
  bg: string;
  bgGradient: [string, string];
  surface: string;
  surface2: string;
  surfaceGlass: string;
  surfaceGlassBorder: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  brand: string;
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  overlay: string;
  shimmer: string;
};

// Identité Toupré — "Tout se loue, tout près."
// Crème chaleureux + corail terracotta + anthracite. Sombre chaud en option.
const lightColors: Palette = {
  primary: "#0A0A0A",
  ink: "#0A0A0A",
  onInk: "#FFFFFF",
  onInkMuted: "rgba(255, 255, 255, 0.58)",
  // #E2674A : corail de marque d'origine, conservé pour le décoratif (seuil 3:1 des
  // éléments d'interface) — jamais pour du texte, qui exige 4.5:1.
  primaryLight: "#0A0A0A",
  primaryDark: "#000000",
  primaryTint: "rgba(10, 10, 10, 0.05)",
  primaryGlow: "rgba(10, 10, 10, 0.06)",
  secondary: "#2F7A6B",
  bg: "#F4F3F0",
  bgGradient: ["#F4F3F0", "#F4F3F0"],
  surface: "#FFFFFF",
  surface2: "#ECEBE7",
  surfaceGlass: "#FFFFFF",
  surfaceGlassBorder: "rgba(10, 10, 10, 0.06)",
  border: "#E4E2DD",
  textPrimary: "#111111",
  textSecondary: "#5E5E5E",
  textTertiary: "#6B6B6B",
  textInverse: "#FFFFFF",
  brand: "#0A0A0A",
  success: "#15803D",
  successBg: "#E7F4EC",
  error: "#DC2626",
  errorBg: "#FCE8E4",
  warning: "#9F600F",
  warningBg: "#FFF1D8",
  overlay: "rgba(0, 0, 0, 0.5)",
  shimmer: "rgba(255, 255, 255, 0.7)",
};

const darkColors: Palette = {
  primary: "#FFFFFF",
  ink: "#1C1C1C",
  onInk: "#FFFFFF",
  onInkMuted: "rgba(255, 255, 255, 0.6)",
  primaryLight: "#FFFFFF",
  primaryDark: "#FFFFFF",
  primaryTint: "rgba(255, 255, 255, 0.08)",
  primaryGlow: "rgba(255, 255, 255, 0.08)",
  secondary: "#6FCDBA",
  bg: "#0A0A0A",
  bgGradient: ["#0A0A0A", "#0A0A0A"],
  surface: "#161616",
  surface2: "#1F1F1F",
  surfaceGlass: "#161616",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.06)",
  border: "rgba(255, 255, 255, 0.10)",
  textPrimary: "#F5F5F5",
  textSecondary: "#B5B5B5",
  textTertiary: "#8C8C8C",
  textInverse: "#0A0A0A",
  brand: "#FFFFFF",
  success: "#4ADE80",
  successBg: "rgba(52, 211, 153, 0.18)",
  error: "#F87171",
  errorBg: "rgba(248, 113, 113, 0.18)",
  warning: "#FBBF24",
  warningBg: "rgba(251, 191, 36, 0.18)",
  overlay: "rgba(0, 0, 0, 0.6)",
  shimmer: "rgba(255, 255, 255, 0.06)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

// Nouvelle clé depuis le rebrand Toupré : l'identité par défaut est le mode crème (light)
const THEME_KEY = "toupre_theme";

type Ctx = {
  mode: ThemeMode;
  isDark: boolean;
  colors: Palette;
  setMode: (m: ThemeMode) => Promise<void>;
};

const ThemeCtx = createContext<Ctx | null>(null);

async function readMode(): Promise<ThemeMode> {
  try {
    if (Platform.OS === "web") {
      const v = localStorage.getItem(THEME_KEY);
      return (v as ThemeMode) || "light";
    }
    const v = await SecureStore.getItemAsync(THEME_KEY);
    return (v as ThemeMode) || "light";
  } catch {
    return "system";
  }
}

async function writeMode(m: ThemeMode) {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(THEME_KEY, m);
    } else {
      await SecureStore.setItemAsync(THEME_KEY, m);
    }
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    (async () => {
      const m = await readMode();
      setModeState(m);
    })();
  }, []);

  const isDark = mode === "system" ? sys === "dark" : mode === "dark";
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo<Ctx>(
    () => ({
      mode,
      isDark,
      colors,
      setMode: async (m: ThemeMode) => {
        setModeState(m);
        await writeMode(m);
      },
    }),
    [mode, isDark, colors]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be in ThemeProvider");
  return c;
}

export function useColors() {
  return useTheme().colors;
}

// Web-friendly shadow helper (uses boxShadow on web, native shadow* on mobile)
export function shadowStyle(opts: {
  color?: string;
  opacity?: number;
  radius?: number;
  offsetY?: number;
  elevation?: number;
}) {
  const color = opts.color || "#000";
  const opacity = opts.opacity ?? 0.08;
  const r = opts.radius ?? 12;
  const y = opts.offsetY ?? 4;
  if (Platform.OS === "web") {
    return {
      boxShadow: `0 ${y}px ${r}px ${rgba(color, opacity)}`,
    } as any;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: r,
    elevation: opts.elevation ?? 4,
  };
}

function rgba(hexOrRgba: string, alpha: number) {
  if (hexOrRgba.startsWith("rgba") || hexOrRgba.startsWith("rgb")) return hexOrRgba;
  const h = hexOrRgba.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
