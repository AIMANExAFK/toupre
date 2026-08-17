import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

// Dépôt d'un avis après une location terminée (spec 004, US1).
// Le serveur vérifie déjà que l'auteur a bien loué l'objet et qu'il n'a pas déjà noté.

const LIBELLES = ["", "Très décevant", "Décevant", "Correct", "Très bien", "Excellent"];

export default function Avis() {
  const { listingId, titre } = useLocalSearchParams<{ listingId: string; titre?: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const peutValider = note >= 1 && !envoi;

  const valider = async () => {
    if (!token || !peutValider) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await apiFetch(
        "/api/reviews",
        {
          method: "POST",
          body: JSON.stringify({
            listing_id: listingId,
            rating: note,
            comment: commentaire.trim(),
          }),
        },
        token,
      );
      router.replace("/(tabs)/bookings");
    } catch (e: any) {
      setErreur(e?.message || "Envoi impossible. Réessayez.");
      setEnvoi(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="avis-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Retour"
              onPress={() => router.back()}
              testID="avis-back"
            >
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Votre avis</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {!!titre && (
              <Text style={[styles.objet, { color: colors.textPrimary }]}>{titre}</Text>
            )}
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              Votre retour aide les prochains locataires à choisir en confiance.
            </Text>

            <View style={styles.etoiles}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  accessibilityRole="button"
                  accessibilityLabel={`Noter ${v} sur 5`}
                  accessibilityState={{ selected: note === v }}
                  onPress={() => setNote(v)}
                  testID={`avis-etoile-${v}`}
                  style={styles.etoileBtn}
                >
                  <Ionicons
                    name={v <= note ? "star" : "star-outline"}
                    size={38}
                    color={v <= note ? colors.warning : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {/* Le libellé double l'information portée par les étoiles : l'appréciation
                ne dépend pas de la seule couleur (accessibilité, spec 002 FR-008). */}
            <Text style={[styles.libelle, { color: note ? colors.textPrimary : colors.textTertiary }]}>
              {note ? LIBELLES[note] : "Choisissez une note"}
            </Text>

            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Commentaire <Text style={[styles.facultatif, { color: colors.textTertiary }]}>facultatif</Text>
            </Text>
            <Glass borderRadius={radius.md} style={styles.zoneWrap}>
              <TextInput
                value={commentaire}
                onChangeText={setCommentaire}
                multiline
                placeholder="Objet conforme, propriétaire ponctuel…"
                placeholderTextColor={colors.textTertiary}
                style={[styles.zone, { color: colors.textPrimary }]}
                testID="avis-commentaire"
              />
            </Glass>

            {erreur && (
              <Text style={[styles.erreur, { color: colors.error }]} testID="avis-erreur">
                {erreur}
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !peutValider }}
              onPress={valider}
              disabled={!peutValider}
              testID="avis-submit"
              style={[
                styles.submit,
                { backgroundColor: peutValider ? colors.primary : colors.surface2 },
                peutValider
                  ? shadowStyle({ color: colors.primary, opacity: 0.4, radius: 18, offsetY: 8 })
                  : null,
              ]}
            >
              {envoi ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text
                  style={[
                    styles.submitTxt,
                    { color: peutValider ? colors.textInverse : colors.textTertiary },
                  ]}
                >
                  {note ? "Publier mon avis" : "Choisissez une note"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  objet: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },
  etoiles: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
  etoileBtn: { padding: 4 },
  libelle: { fontSize: 15, fontWeight: "700", textAlign: "center", marginTop: 8, marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: "800", marginBottom: spacing.sm },
  facultatif: { fontSize: 12, fontWeight: "600" },
  zoneWrap: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 96 },
  zone: { fontSize: 15, minHeight: 76, textAlignVertical: "top" },
  erreur: { fontSize: 13, fontWeight: "700", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  submit: { paddingVertical: 17, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  submitTxt: { fontSize: 16, fontWeight: "800" },
});
