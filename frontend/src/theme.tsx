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
  primary: "#006C67",
  primaryLight: "#26B8A8",
  primaryDark: "#044B49",
  primaryTint: "rgba(0, 108, 103, 0.10)",
  primaryGlow: "rgba(0, 108, 103, 0.18)",
  secondary: "#E85D3F",
  bg: "#F4F7F5",
  bgGradient: ["#F7FAF8", "#E7F0EC"],
  surface: "#FFFFFF",
  surface2: "#E8F0ED",
  surfaceGlass: "rgba(255, 255, 255, 0.88)",
  surfaceGlassBorder: "rgba(12, 40, 37, 0.10)",
  border: "#D7E0DC",
  textPrimary: "#10231F",
  textSecondary: "#53645F",
  textTertiary: "#8B9995",
  textInverse: "#FFFFFF",
  brand: "#0B3D3A",
  success: "#059669",
  successBg: "#DDF6ED",
  error: "#DC2626",
  errorBg: "#FCE8E4",
  warning: "#C87913",
  warningBg: "#FFF1D8",
  overlay: "rgba(5, 20, 18, 0.48)",
  shimmer: "rgba(255, 255, 255, 0.72)",
};

const darkColors: Palette = {
  primary: "#58D6C8",
  primaryLight: "#A0F3E7",
  primaryDark: "#1AA094",
  primaryTint: "rgba(88, 214, 200, 0.14)",
  primaryGlow: "rgba(88, 214, 200, 0.18)",
  secondary: "#FF967A",
  bg: "#0E1515",
  bgGradient: ["#0E1515", "#162221"],
  surface: "#172120",
  surface2: "#202C2A",
  surfaceGlass: "rgba(23, 33, 32, 0.90)",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.10)",
  border: "rgba(255, 255, 255, 0.10)",
  textPrimary: "#F4FBF8",
  textSecondary: "#C2D1CE",
  textTertiary: "#839692",
  textInverse: "#071313",
  brand: "#A0F3E7",
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
