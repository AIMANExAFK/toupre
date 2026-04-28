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
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryDark: "#5B21B6",
  primaryTint: "rgba(124, 58, 237, 0.10)",
  primaryGlow: "rgba(124, 58, 237, 0.18)",
  secondary: "#FF6B6B",
  bg: "#F5F3FF",
  bgGradient: ["#FAF7FF", "#F0EBFF"],
  surface: "#FFFFFF",
  surface2: "#F3F4F6",
  surfaceGlass: "rgba(255, 255, 255, 0.72)",
  surfaceGlassBorder: "rgba(255, 255, 255, 0.6)",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",
  brand: "#6D28D9",
  success: "#10B981",
  successBg: "#D1FAE5",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  overlay: "rgba(17, 24, 39, 0.4)",
  shimmer: "rgba(255, 255, 255, 0.5)",
};

const darkColors: Palette = {
  primary: "#A78BFA",
  primaryLight: "#C4B5FD",
  primaryDark: "#7C3AED",
  primaryTint: "rgba(167, 139, 250, 0.16)",
  primaryGlow: "rgba(167, 139, 250, 0.28)",
  secondary: "#FF8585",
  bg: "#0B0712",
  bgGradient: ["#0B0712", "#180D2E"],
  surface: "#161126",
  surface2: "#1F1832",
  surfaceGlass: "rgba(35, 27, 56, 0.72)",
  surfaceGlassBorder: "rgba(167, 139, 250, 0.18)",
  border: "rgba(255, 255, 255, 0.08)",
  textPrimary: "#F5F3FF",
  textSecondary: "#C4B5D6",
  textTertiary: "#8B7FA8",
  textInverse: "#0B0712",
  brand: "#C4B5FD",
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
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
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
    [mode, isDark]
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
