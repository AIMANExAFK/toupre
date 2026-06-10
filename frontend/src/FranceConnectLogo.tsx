import { View, Text, StyleSheet, Platform } from "react-native";

// Logo officiel FranceConnect — reproduction fidèle
// Source : charte graphique FranceConnect.gouv.fr
// Variante "bouton" : encadré bleu marine #000091 sur fond blanc, texte blanc

type Props = {
  size?: "small" | "medium" | "large";
  variant?: "default" | "white" | "monochrome";
};

export function FranceConnectLogo({ size = "medium", variant = "default" }: Props) {
  const heights = { small: 28, medium: 38, large: 56 };
  const h = heights[size];
  const isWhite = variant === "white";

  // SVG inline pour rendre exactement le logo officiel
  // Format : carré "République Française" (RF) + texte "FranceConnect"
  if (Platform.OS === "web") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: h * 0.18,
          height: h,
        }}
      >
        {/* Carré République Française */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height={h}
          viewBox="0 0 64 64"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <rect
            x="0" y="0" width="64" height="64"
            fill={isWhite ? "#fff" : "#000091"}
            rx="0"
          />
          <text
            x="32" y="22"
            fontFamily="Marianne, Arial, sans-serif"
            fontWeight="900"
            fontSize="13"
            fill={isWhite ? "#000091" : "#fff"}
            textAnchor="middle"
            letterSpacing="-0.3"
          >
            RF
          </text>
          {/* Cocarde tricolore stylisée */}
          <g transform="translate(32 42)">
            <circle cx="0" cy="0" r="8" fill={isWhite ? "#E1000F" : "#fff"} opacity="0.9" />
            <path
              d="M-8 0 A 8 8 0 0 1 8 0 Z"
              fill={isWhite ? "#fff" : "#fff"}
              opacity="0"
            />
            <rect x="-8" y="-1" width="16" height="2" fill={isWhite ? "#fff" : "#E1000F"} />
            <rect x="-8" y="1"  width="16" height="2" fill={isWhite ? "#000091" : "#000091"} />
          </g>
          <text
            x="32" y="58"
            fontFamily="Marianne, Arial, sans-serif"
            fontWeight="700"
            fontSize="4.5"
            fill={isWhite ? "#000091" : "#fff"}
            textAnchor="middle"
            letterSpacing="-0.2"
          >
            RÉPUBLIQUE
          </text>
          <text
            x="32" y="62.5"
            fontFamily="Marianne, Arial, sans-serif"
            fontWeight="700"
            fontSize="4.5"
            fill={isWhite ? "#000091" : "#fff"}
            textAnchor="middle"
            letterSpacing="-0.2"
          >
            FRANÇAISE
          </text>
        </svg>

        {/* Texte FranceConnect */}
        <span
          style={{
            fontFamily: "Marianne, Arial, sans-serif",
            fontSize: h * 0.42,
            fontWeight: 700,
            color: isWhite ? "#fff" : "#000091",
            letterSpacing: -0.5,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontWeight: 800 }}>France</span>
          <span style={{ fontWeight: 400 }}>Connect</span>
        </span>
      </div>
    );
  }

  // Fallback natif : version simplifiée
  return (
    <View style={[styles.row, { height: h, gap: h * 0.18 }]}>
      <View style={[styles.rfBox, { width: h, height: h, backgroundColor: isWhite ? "#fff" : "#000091" }]}>
        <Text style={[styles.rfText, { color: isWhite ? "#000091" : "#fff", fontSize: h * 0.35 }]}>RF</Text>
        <View style={[styles.rfBand, { backgroundColor: isWhite ? "#E1000F" : "#E1000F" }]} />
      </View>
      <Text style={[styles.fcText, { color: isWhite ? "#fff" : "#000091", fontSize: h * 0.42 }]}>
        <Text style={{ fontWeight: "800" }}>France</Text>
        <Text style={{ fontWeight: "400" }}>Connect</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rfBox: { alignItems: "center", justifyContent: "center", position: "relative" },
  rfText: { fontWeight: "900", letterSpacing: -0.5 },
  rfBand: { position: "absolute", bottom: 4, left: 6, right: 6, height: 2 },
  fcText: { letterSpacing: -0.5 },
});
