import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useColors } from "./theme";

// ─── Identité Toupré ─────────────────────────────────────────────
// Marque : un pin de géolocalisation dont l'intérieur dessine un toit
// de maison — "chez quelqu'un, juste à côté".
// Wordmark : "toupré" en Fredoka (chargée dans +html.tsx, web).

export const BRAND_NAME = "Toupré";
export const BRAND_TAGLINE = "Tout se loue, tout près.";

type MarkProps = {
  size?: number;
  color?: string;       // couleur du pin (par défaut : corail primaire)
  inner?: string;       // couleur du toit/point (par défaut : blanc crème)
};

export function ToupreMark({ size = 44, color, inner }: MarkProps) {
  const colors = useColors();
  const pin = color ?? colors.primary;
  const detail = inner ?? "#FFF8F3";
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Pin : goutte arrondie */}
      <Path
        d="M24 3.5C14.6 3.5 7 11 7 20.2c0 6.7 4.3 12.6 8.6 17 2.7 2.8 5.5 5.1 7.3 6.6.6.5 1.6.5 2.2 0 1.8-1.5 4.6-3.8 7.3-6.6 4.3-4.4 8.6-10.3 8.6-17C41 11 33.4 3.5 24 3.5Z"
        fill={pin}
      />
      {/* Toit de maison */}
      <Path
        d="M14.5 22.5 24 13.8l9.5 8.7"
        stroke={detail}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Point de localisation = la porte */}
      <Circle cx={24} cy={26.5} r={3.4} fill={detail} />
    </Svg>
  );
}

type LogoProps = {
  size?: number;          // hauteur du mark
  showWordmark?: boolean;
  wordmarkColor?: string;
  markColor?: string;
};

export function ToupreLogo({ size = 36, showWordmark = true, wordmarkColor, markColor }: LogoProps) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <ToupreMark size={size} color={markColor} />
      {showWordmark && (
        <Text
          // data-brand-font : Fredoka via la CSS globale injectée (web)
          dataSet={{ brandFont: "1" }}
          style={[styles.wordmark, { fontSize: size * 0.72, color: wordmarkColor ?? colors.textPrimary }]}
        >
          toupré
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { fontWeight: "600", letterSpacing: -0.5 },
});
