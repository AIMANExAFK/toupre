import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "./theme";

// En-tête sombre des écrans principaux, dans l'esprit du tableau de bord
// « Slate » : un bloc d'encre qui descend du haut de l'écran, coins bas
// arrondis, titre en blanc ; le contenu reprend ensuite sur fond crème.
// Il prend lui-même en charge la zone de sécurité du haut (encoche).

type Props = {
  /** Petite ligne espacée au-dessus du titre (ex. « TOUPRÉ »). */
  surtitre?: string;
  titre: React.ReactNode;
  sousTitre?: string;
  /** Action(s) à droite du titre — voir BoutonEnTete. */
  droite?: React.ReactNode;
  /** Contenu sous le titre, toujours sur l'encre (recherche, résumé…). */
  children?: React.ReactNode;
  titreTestID?: string;
  /** Taille du titre ; plus petite quand un chiffre en grand suit (Explorer). */
  tailleTitre?: number;
  /** Écrans intérieurs : flèche de retour au-dessus du titre. */
  retour?: () => void;
  retourTestID?: string;
};

export function EnTeteSombre({
  surtitre, titre, sousTitre, droite, children, titreTestID, tailleTitre, retour, retourTestID,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bloc, { backgroundColor: colors.ink, paddingTop: insets.top + 16 }]}>
      {retour ? (
        <View style={{ marginBottom: -2 }}>
          <BoutonEnTete icone="arrow-back" libelle="Retour" onPress={retour} testID={retourTestID} />
        </View>
      ) : null}
      <View style={styles.ligne}>
        <View style={{ flex: 1 }}>
          {surtitre ? <Text style={[styles.surtitre, { color: colors.onInkMuted }]}>{surtitre}</Text> : null}
          <Text
            accessibilityRole="header"
            style={[styles.titre, { color: colors.onInk }, tailleTitre ? { fontSize: tailleTitre } : null]}
            testID={titreTestID}
          >
            {titre}
          </Text>
          {sousTitre ? <Text style={[styles.sousTitre, { color: colors.onInkMuted }]}>{sousTitre}</Text> : null}
        </View>
        {droite ? <View style={styles.droite}>{droite}</View> : null}
      </View>
      {children}
    </View>
  );
}

/** Bouton rond translucide, pour les actions posées sur l'en-tête sombre. */
export function BoutonEnTete({
  icone, libelle, onPress, testID, actif, etendu,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  libelle: string;
  onPress: () => void;
  testID?: string;
  /** Pastille indiquant un état actif (filtres appliqués, etc.). */
  actif?: boolean;
  /** Pour un bouton qui déplie un panneau : annoncé « développé/réduit ». */
  etendu?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={etendu === undefined ? undefined : { expanded: etendu }}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.75}
      style={[styles.bouton, { backgroundColor: "rgba(255, 255, 255, 0.12)" }]}
    >
      <Ionicons name={icone} size={20} color={colors.onInk} />
      {actif ? <View style={[styles.pastille, { backgroundColor: "#FFFFFF" }]} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bloc: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 14,
  },
  ligne: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  surtitre: { fontSize: 11, fontWeight: "600", letterSpacing: 3, marginBottom: 4 },
  titre: { fontSize: 28, fontWeight: "600", letterSpacing: -0.6 },
  sousTitre: { fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  droite: { flexDirection: "row", gap: 8, paddingTop: 2 },
  bouton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pastille: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
});
