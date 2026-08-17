import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "./auth";
import { useColors, spacing, radius, shadowStyle } from "./theme";

export type ReportTargetType = "listing" | "user" | "message" | "review";

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string; // ex: "BMW Série 3" ou nom user
  onSuccess?: () => void;
};

const CATEGORIES: { value: string; icon: any; label: string; desc: string }[] = [
  { value: "scam", icon: "warning-outline",          label: "Arnaque",                desc: "Tentative d'escroquerie, faux profil, paiement hors plateforme" },
  { value: "inappropriate", icon: "alert-circle-outline", label: "Contenu inapproprié",    desc: "Contenu obscène, choquant, déplacé" },
  { value: "illegal", icon: "shield-outline",        label: "Contenu illégal",        desc: "Drogue, arme, contrefaçon, mineurs" },
  { value: "harassment", icon: "skull-outline",      label: "Harcèlement / menaces",  desc: "Insultes, intimidation, discrimination" },
  { value: "spam", icon: "megaphone-outline",        label: "Spam / publicité",       desc: "Publicité indésirable, lien externe douteux" },
  { value: "fake", icon: "duplicate-outline",        label: "Annonce trompeuse",      desc: "Photo volée, description fausse, doublon" },
  { value: "other", icon: "ellipsis-horizontal",     label: "Autre",                  desc: "Précisez la raison" },
];

export function ReportModal({ visible, onClose, targetType, targetId, targetLabel, onSuccess }: Props) {
  const colors = useColors();
  const [category, setCategory] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCategory(null);
    setReason("");
    setSubmitting(false);
    setDone(false);
    setError(null);
  };

  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!category) { setError("Sélectionnez une catégorie."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          category,
          reason: reason.trim(),
        }),
      });
      setDone(true);
      onSuccess?.();
      setTimeout(close, 2000);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du signalement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity accessibilityLabel="Fermer" accessibilityRole="button" onPress={close} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Signaler</Text>
            <View style={{ width: 32 }} />
          </View>

          {done ? (
            <View style={styles.successBox}>
              <View style={[styles.successIcon, { backgroundColor: colors.successBg || "rgba(34,197,94,0.15)" }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Signalement envoyé</Text>
              <Text style={[styles.successText, { color: colors.textSecondary }]}>
                Merci. Notre équipe Trust & Safety va examiner ce contenu sous 24h.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {targetLabel && (
                <View style={[styles.targetCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Ionicons name={targetType === "user" ? "person" : targetType === "message" ? "chatbubble" : "cube"} size={16} color={colors.textSecondary} />
                  <Text style={[styles.targetText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {targetLabel}
                  </Text>
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Pourquoi signaler ce contenu ?
              </Text>

              <View style={{ gap: 6 }}>
                {CATEGORIES.map((cat) => {
                  const selected = category === cat.value;
                  return (
                    <TouchableOpacity accessibilityRole="button"
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      activeOpacity={0.7}
                      style={[
                        styles.catRow,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        selected && { borderColor: colors.primary, backgroundColor: colors.primaryTint },
                      ]}
                      testID={`report-cat-${cat.value}`}
                    >
                      <View style={[
                        styles.catIcon,
                        { backgroundColor: selected ? colors.primary : colors.surface2 },
                      ]}>
                        <Ionicons name={cat.icon} size={16} color={selected ? colors.textInverse : colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.catLabel, { color: selected ? colors.primary : colors.textPrimary }]}>
                          {cat.label}
                        </Text>
                        <Text style={[styles.catDesc, { color: colors.textSecondary }]}>{cat.desc}</Text>
                      </View>
                      <View style={[
                        styles.radio,
                        { borderColor: selected ? colors.primary : colors.border },
                        selected && { backgroundColor: colors.primary },
                      ]}>
                        {selected && <Ionicons name="checkmark" size={12} color={colors.textInverse} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                Précisez (optionnel)
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Décrivez ce qui pose problème (optionnel, max 500 caractères)"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.textarea,
                  { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {reason.length} / 500
              </Text>

              {error && (
                <View style={[styles.errBox, { backgroundColor: colors.errorBg }]}>
                  <Ionicons name="alert-circle" size={15} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
              )}

              <View style={[styles.disclaimer, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                  Votre signalement est anonyme pour la personne concernée. Les abus de la fonction signalement entraînent une suspension de compte.
                </Text>
              </View>

              <TouchableOpacity accessibilityRole="button"
                onPress={submit}
                disabled={!category || submitting} accessibilityState={{ disabled: !category || submitting }}
                style={[
                  styles.submitBtn,
                  { backgroundColor: !category ? colors.border : colors.error },
                  category && shadowStyle({ color: colors.error, opacity: 0.35, radius: 12, offsetY: 4 }),
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="flag" size={16} color={!category ? colors.textTertiary : colors.textInverse} />
                    <Text style={[styles.submitText, { color: !category ? colors.textTertiary : colors.textInverse }]}>
                      Envoyer le signalement
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    ...(Platform.OS === "web" ? { backdropFilter: "blur(8px)" as any } : {}),
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  body: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 4,
  },
  targetText: { flex: 1, fontSize: 13, fontWeight: "700" },
  sectionLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  catIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 14, fontWeight: "700" },
  catDesc: { fontSize: 11, lineHeight: 15, marginTop: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  textarea: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
    lineHeight: 18,
  },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 4 },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 15 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  submitText: { fontSize: 14, fontWeight: "800" },
  successBox: {
    padding: spacing.xl,
    alignItems: "center",
    gap: 12,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  successText: { fontSize: 13, lineHeight: 18, textAlign: "center", paddingHorizontal: spacing.md },
});
