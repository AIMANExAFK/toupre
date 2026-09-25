import React from "react";
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "./theme";

type Props = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  borderRadius?: number;
  /** Permet de cibler l'élément dans les tests (RN et web). */
  testID?: string;
};

export function Glass({ style, children, borderRadius = 20, testID }: Props) {
  const { isDark, colors } = useTheme();
  if (Platform.OS === "web") {
    return (
      <View
        testID={testID}
        style={[
          {
            // Style « Slate » : surface pleine, sans liseré ; c'est l'ombre, très
            // douce, qui détache la carte du fond crème.
            backgroundColor: colors.surfaceGlass,
            borderRadius,
            // Pas de liseré par défaut, mais une couleur de bordure quand même :
            // plusieurs écrans passent `borderWidth` en comptant dessus — sans
            // elle, le navigateur retombe sur un contour noir.
            borderWidth: 0,
            borderColor: colors.surfaceGlassBorder,
            // @ts-ignore web only
            boxShadow: isDark
              ? "0 10px 30px rgba(0, 0, 0, 0.28)"
              : "0 1px 2px rgba(43, 36, 32, 0.04), 0 10px 28px rgba(43, 36, 32, 0.06)",
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
    <View
      testID={testID}
      style={[
        {
          borderRadius,
          overflow: "hidden",
          backgroundColor: colors.surfaceGlass,
          borderWidth: 0,
          borderColor: colors.surfaceGlassBorder,
          shadowColor: "#2B2420",
          shadowOpacity: isDark ? 0.3 : 0.07,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function GradientBg({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
