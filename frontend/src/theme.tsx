import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "light" | "dark" | "system";

type Palette = {
  primary: string;
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
  primary: "#CE4221",
  // #E2674A : corail de marque d'origine, conservé pour le décoratif (seuil 3:1 des
  // éléments d'interface) — jamais pour du texte, qui exige 4.5:1.
  primaryLight: "#E2674A",
  primaryDark: "#A8351A",
  primaryTint: "rgba(226, 103, 74, 0.10)",
  primaryGlow: "rgba(226, 103, 74, 0.18)",
  secondary: "#2F7A6B",
  bg: "#FFF8F3",
  bgGradient: ["#FFFBF7", "#FCEFE6"],
  surface: "#FFFFFF",
  surface2: "#F8EBE2",
  surfaceGlass: "rgba(255, 255, 255, 0.90)",
  surfaceGlassBorder: "rgba(63, 42, 33, 0.10)",
  border: "#EBDDD3",
  textPrimary: "#2B2420",
  textSecondary: "#6B5D54",
  textTertiary: "#807066",
  textInverse: "#FFFFFF",
  brand: "#A8351A",
  success: "#188261",
  successBg: "#E1F5EE",
  error: "#DC2626",
  errorBg: "#FCE8E4",
  warning: "#9F600F",
  warningBg: "#FFF1D8",
  overlay: "rgba(43, 36, 32, 0.48)",
  shimmer: "rgba(255, 255, 255, 0.72)",
};

const darkColors: Palette = {
  primary: "#F08A6C",
  primaryLight: "#FFB39C",
  primaryDark: "#E2674A",
  primaryTint: "rgba(240, 138, 108, 0.14)",
  primaryGlow: "rgba(240, 138, 108, 0.18)",
  secondary: "#6FCDBA",
  bg: "#1A1411",
  bgGradient: ["#1A1411", "#241B16"],
  surface: "#241C17",
  surface2: "#2F241E",
  surfaceGlass: "rgba(36, 28, 23, 0.90)",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.10)",
  border: "rgba(255, 255, 255, 0.10)",
  textPrimary: "#FAF3EE",
  textSecondary: "#D6C8BF",
  textTertiary: "#9C8D83",
  textInverse: "#241511",
  brand: "#FFB39C",
  success: "#34D399",
  successBg: "rgba(52, 211, 153, 0.18)",
  error: "#F87171",
  errorBg: "rgba(248, 113, 113, 0.18)",
  warning: "#FBBF24",
  warningBg: "rgba(251, 191, 36, 0.18)",
  overlay: "rgba(0, 0, 0, 0.55)",
  shimmer: "rgba(240, 138, 108, 0.16)",
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
  sm: 6,
  md: 8,
  lg: 8,
  xl: 12,
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
