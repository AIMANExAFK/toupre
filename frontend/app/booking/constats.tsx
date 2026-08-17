import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { InspectionView, Inspection } from "../../src/InspectionView";

// Consultation partagée des états des lieux (spec 001, US3).
// Le même écran sert le locataire et le propriétaire : le serveur autorise
// tout participant de la réservation, l'auteur est déduit du compte connecté.

export default function Constats() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [items, setItems] = useState<Inspection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setItems(await apiFetch(`/api/bookings/${id}/inspections`, {}, token));
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les constats.");
      setItems([]);
    }
  }, [token, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // L'utilisateur n'a pas encore déposé de constat pour une étape déjà entamée
  // par l'autre partie : il peut ajouter sa propre observation (FR-006, symétrie).
  const mine = (kind: string) =>
    (items || []).some((i) => i.kind === kind && i.author_name === user?.name);
  const exists = (kind: string) => (items || []).some((i) => i.kind === kind);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="constats-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} testID="constats-back">
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>États des lieux</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {items === null ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
            ) : items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyTxt, { color: colors.textSecondary }]}>
                  Aucun état des lieux pour cette location.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.intro, { color: colors.textSecondary }]}>
                  Ces constats sont définitifs et visibles par les deux parties.
                </Text>
                {items.map((i) => (
                  <InspectionView key={i.id} item={i} />
                ))}
              </>
            )}

            {/* Contre-observation : l'autre partie a documenté une étape, pas moi */}
            {(["pickup", "return"] as const).map((kind) =>
              exists(kind) && !mine(kind) ? (
                <TouchableOpacity
                  key={kind}
                  onPress={() => router.push(`/booking/constat?id=${id}&kind=${kind}`)}
                  testID={`add-counter-${kind}`}
                  style={[styles.counterBtn, { borderColor: colors.primary }]}
                >
                  <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
                  <Text style={[styles.counterTxt, { color: colors.primary }]}>
                    Ajouter mon constat de {kind === "pickup" ? "remise" : "retour"}
                  </Text>
                </TouchableOpacity>
              ) : null,
            )}

            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          </ScrollView>
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
  intro: { fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  empty: { alignItems: "center", gap: 12, marginTop: spacing.xxl },
  emptyTxt: { fontSize: 14, textAlign: "center" },
  counterBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5,
    borderStyle: "dashed", marginTop: spacing.sm,
  },
  counterTxt: { fontSize: 14, fontWeight: "800" },
  error: { fontSize: 13, fontWeight: "700", marginTop: spacing.md },
});
