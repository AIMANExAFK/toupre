import React from "react";
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "./theme";

type Props = {
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  borderRadius?: number;
  /** Permet de cibler l'élément dans les tests (RN et web). */
  testID?: string;
};

export function Glass({ intensity = 35, style, children, borderRadius = 8, testID }: Props) {
  const { isDark, colors } = useTheme();
  if (Platform.OS === "web") {
    return (
      <View
        testID={testID}
        style={[
          {
            backgroundColor: colors.surfaceGlass,
            borderRadius,
            borderWidth: 1,
            borderColor: colors.surfaceGlassBorder,
            // @ts-ignore web only
            backdropFilter: "blur(18px) saturate(145%)",
            // @ts-ignore web only
            WebkitBackdropFilter: "blur(18px) saturate(145%)",
            // @ts-ignore web only
            boxShadow: "0 1px 0 rgba(255,255,255,0.58) inset, 0 18px 42px rgba(11, 61, 58, 0.08)",
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
      testID={testID}
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
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <View pointerEvents="none" style={[styles.topWash, { backgroundColor: colors.bgGradient[1] }]} />
      <View pointerEvents="none" style={[styles.topAccent, { backgroundColor: colors.primaryGlow }]} />
      <View pointerEvents="none" style={[styles.rule, { backgroundColor: colors.border }]} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 230,
    opacity: 0.86,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  rule: {
    position: "absolute",
    top: 229,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
});
