import React from "react";
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "./theme";

type Props = {
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  borderRadius?: number;
};

export function Glass({ intensity = 50, style, children, borderRadius = 20 }: Props) {
  const { isDark, colors } = useTheme();
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          {
            backgroundColor: colors.surfaceGlass,
            borderRadius,
            borderWidth: 1,
            borderColor: colors.surfaceGlassBorder,
            // @ts-ignore web only
            backdropFilter: "blur(22px) saturate(180%)",
            // @ts-ignore web only
            WebkitBackdropFilter: "blur(22px) saturate(180%)",
            overflow: "hidden",
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? "dark" : "light"}
      style={[
        {
          borderRadius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.surfaceGlassBorder,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, backgroundColor: colors.surfaceGlass }}>{children}</View>
    </BlurView>
  );
}

export function GradientBg({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      {/* Decorative glow blobs */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: colors.primaryGlow,
          opacity: isDark ? 0.55 : 0.6,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -140,
          left: -100,
          width: 360,
          height: 360,
          borderRadius: 180,
          backgroundColor: isDark ? "rgba(196, 181, 253, 0.18)" : "rgba(255, 107, 107, 0.18)",
        }}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
