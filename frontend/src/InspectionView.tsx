import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius } from "./theme";
import { Glass } from "./Glass";

// Affichage lecture seule d'un état des lieux (spec 001, FR-005/FR-006).
// Aucun contrôle d'édition : un constat validé est définitif.

export type Inspection = {
  id: string;
  kind: "pickup" | "return";
  condition: "ok" | "issue" | "damaged";
  notes: string;
  photos: string[];
  created_at: string;
  author_name?: string;
  author_role?: "owner" | "renter";
};

const CONDITION_LABEL: Record<string, string> = {
  ok: "Conforme",
  issue: "Problème mineur",
  damaged: "Dégradé",
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function InspectionView({ item }: { item: Inspection }) {
  const colors = useColors();
  const isProblem = item.condition !== "ok";
  const tone = isProblem ? colors.error : colors.success;

  return (
    <Glass borderRadius={radius.lg} style={styles.card} testID={`inspection-${item.kind}`}>
      <View style={styles.head}>
        <View style={[styles.kindPill, { backgroundColor: colors.primaryTint }]}>
          <Ionicons
            name={item.kind === "pickup" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.kindTxt, { color: colors.primary }]}>
            {item.kind === "pickup" ? "Remise" : "Retour"}
          </Text>
        </View>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="person-circle-outline" size={15} color={colors.textSecondary} />
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {item.author_name || "—"}
          {item.author_role ? (item.author_role === "owner" ? " · propriétaire" : " · locataire") : ""}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons
          name={isProblem ? "alert-circle-outline" : "checkmark-circle-outline"}
          size={15}
          color={tone}
        />
        <Text style={[styles.condition, { color: tone }]}>
          {CONDITION_LABEL[item.condition] || item.condition}
        </Text>
      </View>

      {!!item.notes && (
        <Text style={[styles.notes, { color: colors.textPrimary }]}>{item.notes}</Text>
      )}

      {item.photos?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
          {item.photos.map((p, i) => (
            <Image
              key={i}
              source={{ uri: p }}
              style={styles.photo}
              alt={`Photo ${i + 1} du constat de ${item.kind === "pickup" ? "remise" : "retour"}`}
            />
          ))}
        </ScrollView>
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, marginBottom: spacing.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kindPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md,
  },
  kindTxt: { fontSize: 12, fontWeight: "600" },
  date: { fontSize: 12, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  meta: { fontSize: 13, fontWeight: "600" },
  condition: { fontSize: 13, fontWeight: "600" },
  notes: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  photos: { marginTop: 12 },
  photo: { width: 92, height: 92, borderRadius: radius.md, marginRight: 8 },
});
