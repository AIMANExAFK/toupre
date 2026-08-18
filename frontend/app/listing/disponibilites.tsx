import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { Calendrier } from "../../src/Calendrier";

// Le propriétaire ferme les jours où son objet n'est pas disponible (spec 005, US3).
// Un jour déjà réservé n'est pas modifiable ici : il ne dépend plus de lui.

export default function Disponibilites() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [titre, setTitre] = useState("");
  const [reserves, setReserves] = useState<string[]>([]);
  const [fermes, setFermes] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!id) return;
    try {
      const [annonce, dispo] = await Promise.all([
        apiFetch(`/api/listings/${id}`),
        apiFetch(`/api/listings/${id}/availability`),
      ]);
      setTitre(annonce.title);
      setReserves(dispo.booked_dates || []);
      setFermes(dispo.blocked_dates || []);
      setInitial(dispo.blocked_dates || []);
    } catch (e: any) {
      setErreur(e?.message || "Impossible de charger le calendrier.");
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  const basculer = (jour: string) => {
    if (reserves.includes(jour)) return; // réservé : plus à sa main
    setFermes((f) => (f.includes(jour) ? f.filter((j) => j !== jour) : [...f, jour]));
  };

  const modifie =
    fermes.length !== initial.length || fermes.some((j) => !initial.includes(j));

  const enregistrer = async () => {
    if (!token || !modifie) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await apiFetch(
        `/api/listings/${id}/availability`,
        { method: "PATCH", body: JSON.stringify({ blocked_dates: fermes }) },
        token,
      );
      setInitial(fermes);
      router.back();
    } catch (e: any) {
      setErreur(e?.message || "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="dispo-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} testID="dispo-back">
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Disponibilités</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {chargement ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
            ) : (
              <>
                <Text style={[styles.objet, { color: colors.textSecondary }]} numberOfLines={1}>{titre}</Text>
                <Text style={[styles.intro, { color: colors.textSecondary }]}>
                  Appuyez sur un jour pour le fermer à la location. Les jours déjà
                  réservés ne peuvent plus être modifiés.
                </Text>
                <Glass borderRadius={radius.lg} style={{ overflow: "hidden" }}>
                  <View style={{ padding: spacing.md }}>
                    <Calendrier
                      mode="bascule"
                      indisponibles={[...reserves, ...fermes]}
                      fermes={fermes}
                      onBascule={basculer}
                    />
                  </View>
                </Glass>
                <Text style={[styles.compte, { color: colors.textTertiary }]} testID="dispo-compte">
                  {fermes.length === 0
                    ? "Aucun jour fermé"
                    : `${fermes.length} jour${fermes.length > 1 ? "s" : ""} fermé${fermes.length > 1 ? "s" : ""}`}
                </Text>
                {erreur && <Text style={[styles.erreur, { color: colors.error }]}>{erreur}</Text>}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !modifie || envoi }}
              disabled={!modifie || envoi}
              onPress={enregistrer}
              testID="dispo-submit"
              style={[
                styles.submit,
                { backgroundColor: modifie ? colors.primary : colors.surface2 },
                modifie ? shadowStyle({ color: colors.primary, opacity: 0.4, radius: 18, offsetY: 8 }) : null,
              ]}
            >
              {envoi ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={[styles.submitTxt, { color: modifie ? colors.textInverse : colors.textTertiary }]}>
                  {modifie ? "Enregistrer" : "Aucune modification"}
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
  objet: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  compte: { fontSize: 12.5, textAlign: "center", marginTop: spacing.sm },
  erreur: { fontSize: 13, fontWeight: "700", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  submit: { paddingVertical: 17, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  submitTxt: { fontSize: 16, fontWeight: "800" },
});
