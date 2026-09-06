import { useState } from "react";
import { View, Image, StyleSheet, ImageStyle, StyleProp, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "./theme";

// Toutes les photos de l'application passent par ici.
//
// Deux raisons :
//
// 1. LE POIDS. Les photothèques servent l'original — mesuré : 0,7 à 5 Mo par
//    image, soit une quinzaine de mégaoctets pour un écran de 8 annonces. On
//    demandait un fichier de 6 mégapixels pour l'afficher sur 350 points de
//    large. Les deux CDN utilisés savent redimensionner à la volée : il suffit
//    de le leur demander.
//
// 2. L'ÉCHEC SILENCIEUX. Une image qui ne charge pas laissait un rectangle
//    noir, impossible à distinguer d'une photo sombre. Un repli explicite vaut
//    mieux qu'un trou.

/** Ajoute au besoin les paramètres de redimensionnement du CDN. */
export function photoDimensionnee(uri: string, largeur: number): string {
  if (!uri || uri.startsWith("data:") || uri.startsWith("file:")) return uri;
  // Densité 2× pour rester net sur un écran de téléphone, plafonnée : au-delà
  // l'œil ne fait plus la différence mais l'octet, si.
  const l = Math.min(Math.round(largeur * 2), 1400);
  try {
    const u = new URL(uri);
    if (u.hostname.endsWith("pexels.com")) {
      u.searchParams.set("auto", "compress");
      u.searchParams.set("cs", "tinysrgb");
      u.searchParams.set("w", String(l));
      return u.toString();
    }
    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", String(l));
      u.searchParams.set("q", "72");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }
  } catch {
    // URI relative ou malformée : on la laisse telle quelle.
  }
  return uri;
}

type Props = {
  uri?: string | null;
  /** Largeur d'affichage en points — sert à demander la bonne taille au CDN. */
  largeur: number;
  style?: StyleProp<ImageStyle>;
  /** Description pour les lecteurs d'écran ; "" pour une image décorative. */
  alt: string;
  /** Icône du repli, selon ce que la photo devait montrer. */
  icone?: keyof typeof Ionicons.glyphMap;
  transform?: any;
  testID?: string;
};

export function Photo({ uri, largeur, style, alt, icone = "image-outline", transform, testID }: Props) {
  const colors = useColors();
  const [etat, setEtat] = useState<"charge" | "prete" | "echec">(uri ? "charge" : "echec");

  if (!uri || etat === "echec") {
    return (
      <View
        style={[style, styles.repli, { backgroundColor: colors.surface2 }]}
        accessibilityLabel={alt || undefined}
        testID={testID}
      >
        <Ionicons name={icone} size={26} color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <View style={[style, { backgroundColor: colors.surface2, overflow: "hidden" }]}>
      <Animated.Image
        source={{ uri: photoDimensionnee(uri, largeur) }}
        style={[StyleSheet.absoluteFill, transform ? { transform } : null]}
        alt={alt}
        testID={testID}
        onLoad={() => setEtat("prete")}
        onError={() => setEtat("echec")}
      />
      {/* Le fond teinté reste visible tant que la photo n'est pas arrivée :
          pas de flash blanc, pas de saut de mise en page. */}
    </View>
  );
}

const styles = StyleSheet.create({
  repli: { alignItems: "center", justifyContent: "center" },
});
