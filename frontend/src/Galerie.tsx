import { useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, radius } from "./theme";
import { Photo } from "./Photo";
import { compte } from "./francais";

// Galerie d'annonce (plusieurs angles). Le modèle stockait déjà un tableau de
// photos, mais l'application n'en montrait qu'une : pour un objet qu'on prête à
// un voisin, voir l'état réel sous plusieurs angles est la première assurance —
// et la première pièce en cas de désaccord.

type Props = {
  photos: string[];
  titre: string;
  hauteur: number;
  /** Largeur d'affichage, pour demander la bonne taille au CDN. */
  largeur: number;
};

export function Galerie({ photos, titre, hauteur, largeur }: Props) {
  const colors = useColors();
  const { width: largeurEcran } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);
  // useWindowDimensions peut renvoyer 0 à l'hydratation web : on retombe alors
  // sur la largeur annoncée par l'appelant.
  const pas = largeurEcran > 0 ? largeurEcran : largeur;

  if (photos.length <= 1) {
    return (
      <Photo
        uri={photos[0]}
        largeur={largeur}
        style={{ width: "100%", height: hauteur }}
        alt={`Photo de ${titre}`}
        icone="cube-outline"
      />
    );
  }

  return (
    <View style={{ height: hauteur }} testID="galerie">
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / pas);
          if (i !== index && i >= 0 && i < photos.length) setIndex(i);
        }}
        scrollEventThrottle={16}
      >
        {photos.map((p, i) => (
          <Photo
            key={i}
            uri={p}
            largeur={largeur}
            style={{ width: pas, height: hauteur }}
            alt={`Photo ${i + 1} sur ${photos.length} de ${titre}`}
            icone="cube-outline"
          />
        ))}
      </ScrollView>

      {/* Compteur : on sait combien de photos restent à voir, même sans faire défiler */}
      <View style={styles.compteur} testID="galerie-compteur">
        <Ionicons name="images-outline" size={12} color="#fff" />
        <Text style={styles.compteurTxt}>{index + 1} / {photos.length}</Text>
      </View>

      <View style={styles.points} pointerEvents="box-none">
        {photos.map((_, i) => (
          <TouchableOpacity
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Voir la photo ${i + 1} sur ${photos.length}`}
            accessibilityState={{ selected: i === index }}
            onPress={() => { scroll.current?.scrollTo({ x: i * pas, animated: true }); setIndex(i); }}
            testID={`galerie-point-${i}`}
            style={styles.zonePoint}
          >
            <View style={[styles.point, i === index ? styles.pointActif : null]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Rangée de vignettes réordonnables pour les écrans de publication. */
export function Vignettes({
  photos, onRetirer, onAjouter, max,
}: { photos: string[]; onRetirer: (i: number) => void; onAjouter: () => void; max: number }) {
  const colors = useColors();
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangee}>
        {photos.map((p, i) => (
          <View key={i} style={styles.vignetteWrap}>
            <Photo uri={p} largeur={92} style={styles.vignette} alt={`Photo ${i + 1}`} />
            {i === 0 && (
              <View style={[styles.badgePrincipale, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeTxt, { color: colors.textInverse }]}>Principale</Text>
              </View>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Retirer la photo ${i + 1}`}
              onPress={() => onRetirer(i)}
              testID={`retirer-photo-${i}`}
              style={[styles.retirer, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="close" size={13} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < max && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
            onPress={onAjouter}
            testID="ajouter-photo"
            style={[styles.ajouter, { borderColor: colors.primary }]}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
      <Text style={[styles.aide, { color: colors.textTertiary }]}>
        {photos.length === 0
          ? `Jusqu'à ${max} photos — la première est celle qu'on voit dans la liste.`
          : `${compte(photos.length, "photo")} sur ${max}. La première est celle qu'on voit dans la liste.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compteur: {
    position: "absolute", bottom: 10, right: 14, flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)",
  },
  compteurTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  points: {
    position: "absolute", bottom: 10, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center",
  },
  zonePoint: { padding: 6 },
  point: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  pointActif: { backgroundColor: "#fff", width: 18 },

  rangee: { gap: 10, paddingVertical: 2 },
  vignetteWrap: { position: "relative" },
  vignette: { width: 92, height: 92, borderRadius: radius.sm },
  badgePrincipale: {
    position: "absolute", bottom: 5, left: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  badgeTxt: { fontSize: 9, fontWeight: "800" },
  retirer: {
    position: "absolute", top: -5, right: -5, width: 24, height: 24, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  ajouter: {
    width: 92, height: 92, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  aide: { fontSize: 11.5, marginTop: 8, lineHeight: 16 },
});
