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

const lightColors: Palette = {
  primary: "#0F766E",
  primaryLight: "#2DD4BF",
  primaryDark: "#115E59",
  primaryTint: "rgba(15, 118, 110, 0.10)",
  primaryGlow: "rgba(15, 118, 110, 0.16)",
  secondary: "#F97316",
  bg: "#F6F5EF",
  bgGradient: ["#F8F7F1", "#ECE8DA"],
  surface: "#FFFFFF",
  surface2: "#EEEADF",
  surfaceGlass: "rgba(255, 255, 255, 0.92)",
  surfaceGlassBorder: "rgba(17, 24, 39, 0.08)",
  border: "#DED8CA",
  textPrimary: "#17211D",
  textSecondary: "#59645E",
  textTertiary: "#8A918B",
  textInverse: "#FFFFFF",
  brand: "#123C35",
  success: "#059669",
  successBg: "#DDF4EA",
  error: "#DC2626",
  errorBg: "#FDE7E7",
  warning: "#D97706",
  warningBg: "#FFF2CC",
  overlay: "rgba(17, 24, 39, 0.44)",
  shimmer: "rgba(255, 255, 255, 0.65)",
};

const darkColors: Palette = {
  primary: "#5EEAD4",
  primaryLight: "#99F6E4",
  primaryDark: "#14B8A6",
  primaryTint: "rgba(94, 234, 212, 0.14)",
  primaryGlow: "rgba(94, 234, 212, 0.18)",
  secondary: "#FDBA74",
  bg: "#101512",
  bgGradient: ["#101512", "#1D261F"],
  surface: "#18201C",
  surface2: "#222C26",
  surfaceGlass: "rgba(24, 32, 28, 0.92)",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.10)",
  border: "rgba(255, 255, 255, 0.10)",
  textPrimary: "#F6F5EF",
  textSecondary: "#C8D0C9",
  textTertiary: "#8E9B92",
  textInverse: "#0F1713",
  brand: "#99F6E4",
  success: "#34D399",
  successBg: "rgba(52, 211, 153, 0.18)",
  error: "#F87171",
  errorBg: "rgba(248, 113, 113, 0.18)",
  warning: "#FBBF24",
  warningBg: "rgba(251, 191, 36, 0.18)",
  overlay: "rgba(0, 0, 0, 0.55)",
  shimmer: "rgba(167, 139, 250, 0.18)",
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

const THEME_KEY = "locashare_theme";

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
      return (v as ThemeMode) || "system";
    }
    const v = await SecureStore.getItemAsync(THEME_KEY);
    return (v as ThemeMode) || "system";
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
  const [mode, setModeState] = useState<ThemeMode>("system");

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
