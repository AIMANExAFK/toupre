import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useColors, spacing, radius, ThemeMode } from "../src/theme";
import { apiFetch, useAuth } from "../src/auth";
import { Glass, GradientBg } from "../src/Glass";
import { EnTeteSombre } from "../src/EnTeteSombre";

type DetailKey = "privacy" | "terms" | "data" | "rate";

const DETAILS: Record<DetailKey, { title: string; icon: string; body: string[]; action?: string }> = {
  privacy: {
    title: "Confidentialité",
    icon: "shield-outline",
    body: [
      "Toupré utilise vos informations uniquement pour sécuriser les locations, afficher les annonces et faciliter les échanges entre utilisateurs.",
      "Les données sensibles ne sont pas revendues. Les informations de paiement restent traitées par un prestataire sécurisé.",
      "Vous pouvez demander l'export ou la suppression de vos données depuis la section Gérer mes données.",
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    icon: "document-text-outline",
    body: [
      "Chaque utilisateur s'engage à publier des annonces honnêtes, avec des photos claires, un prix réel et un lieu de retrait précis.",
      "Le locataire doit restituer le bien dans l'état initial. Le propriétaire doit fournir un objet conforme à l'annonce.",
      "En cas de litige, Toupré peut suspendre une annonce ou un compte le temps de vérifier la situation.",
    ],
  },
  data: {
    title: "Mes données",
    icon: "lock-closed-outline",
    body: [
      "Vous pouvez préparer une demande d'export, de correction ou de suppression de compte.",
      "Pour une application de test, cette action affiche le parcours prévu. En production, elle déclenchera une demande sécurisée côté serveur.",
    ],
    action: "Demander un export",
  },
  rate: {
    title: "Évaluer Toupré",
    icon: "star-outline",
    body: [
      "Merci de tester Toupré. Votre retour aide à améliorer la recherche, les réservations et la publication d'annonce.",
      "Choisissez une note rapide ci-dessous. En production, ce bouton ouvrira aussi la page App Store ou Play Store.",
    ],
    action: "Envoyer un avis",
  },
};

export default function Settings() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const [suppression, setSuppression] = useState(false);

  // Suppression de compte (spec 004, US2) : double confirmation, car irréversible.
  const supprimerCompte = () => {
    Alert.alert(
      "Supprimer votre compte ?",
      "Vos annonces seront retirées et votre identité n'apparaîtra plus. Les locations déjà réalisées resteront visibles par l'autre partie, sans votre nom. Cette action est définitive.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setSuppression(true);
            try {
              await apiFetch("/api/auth/me", { method: "DELETE" }, token);
              await logout();
              router.replace("/auth/otp");
            } catch (e: any) {
              setSuppression(false);
              Alert.alert("Suppression impossible", e?.message ?? "Réessayez plus tard.");
            }
          },
        },
      ],
    );
  };

  const [detail, setDetail] = useState<DetailKey | null>(null);
  const [rating, setRating] = useState(0);

  if (detail) {
    const current = DETAILS[detail];
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }} testID={`settings-detail-${detail}`}>
        <GradientBg>
          <SafeAreaView style={{ flex: 1 }} edges={[]}>
            <EnTeteSombre
              titre={<>{current.title}</>}
              retour={() => setDetail(null)}
              retourTestID="settings-detail-back"
            />

            <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
              <Glass borderRadius={radius.lg} style={styles.detailCard}>
                <View style={[styles.detailIcon, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name={current.icon as any} size={28} color={colors.primary} />
                </View>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{current.title}</Text>
                {current.body.map((paragraph) => (
                  <Text key={paragraph} style={[styles.detailText, { color: colors.textSecondary }]}>
                    {paragraph}
                  </Text>
                ))}

                {detail === "rate" && (
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Noter ${value} sur 5`} key={value} onPress={() => setRating(value)} testID={`rate-${value}`}>
                        <Ionicons
                          name={value <= rating ? "star" : "star-outline"}
                          size={30}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!!current.action && (
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (detail === "data") setDetail("privacy");
                      if (detail === "rate") setRating(rating || 5);
                    }}
                    testID={`settings-action-${detail}`}
                  >
                    <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>
                      {detail === "rate" && rating ? "Merci pour votre note" : current.action}
                    </Text>
                  </TouchableOpacity>
                )}
              </Glass>
            </ScrollView>
          </SafeAreaView>
        </GradientBg>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="settings-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <EnTeteSombre
            titre="Paramètres"
            retour={() => router.replace("/(tabs)/profile")}
            retourTestID="settings-back"
          />

          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.section, { color: colors.textSecondary }]}>APPARENCE</Text>
            <Glass borderRadius={radius.lg}>
              <ThemeRow label="Clair" value="light" current={mode} onSelect={setMode} icon="sunny-outline" colors={colors} />
              <Divider colors={colors} />
              <ThemeRow label="Sombre" value="dark" current={mode} onSelect={setMode} icon="moon-outline" colors={colors} />
              <Divider colors={colors} />
              <ThemeRow label="Système" value="system" current={mode} onSelect={setMode} icon="phone-portrait-outline" colors={colors} />
            </Glass>

            <Text style={[styles.section, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
            <Glass borderRadius={radius.lg}>
              <ToggleRow label="Notifications push" icon="notifications-outline" defaultOn colors={colors} />
              <Divider colors={colors} />
              <ToggleRow label="Emails marketing" icon="mail-outline" defaultOn={false} colors={colors} />
              <Divider colors={colors} />
              <ToggleRow label="Rappels de réservation" icon="alarm-outline" defaultOn colors={colors} />
            </Glass>

            <Text style={[styles.section, { color: colors.textSecondary }]}>CONFIDENTIALITÉ</Text>
            <Glass borderRadius={radius.lg}>
              <LinkRow label="Politique de confidentialité" icon="shield-outline" colors={colors} onPress={() => setDetail("privacy")} />
              <Divider colors={colors} />
              <LinkRow label="Conditions d'utilisation" icon="document-text-outline" colors={colors} onPress={() => setDetail("terms")} />
              <Divider colors={colors} />
              <LinkRow label="Gérer mes données" icon="lock-closed-outline" colors={colors} onPress={() => setDetail("data")} />
            </Glass>

            <Text style={[styles.section, { color: colors.error }]}>COMPTE</Text>
            <Glass borderRadius={radius.lg}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Supprimer définitivement mon compte"
                onPress={supprimerCompte}
                disabled={suppression}
                accessibilityState={{ disabled: suppression }}
                style={styles.dangerRow}
                testID="delete-account-btn"
              >
                <Ionicons name="trash-outline" size={19} color={colors.error} />
                <Text style={[styles.dangerTxt, { color: colors.error }]}>
                  {suppression ? "Suppression en cours…" : "Supprimer mon compte"}
                </Text>
              </TouchableOpacity>
            </Glass>
            <Text style={[styles.dangerNote, { color: colors.textTertiary }]}>
              Vos annonces sont retirées et votre identité n'apparaît plus nulle part. Les locations
              déjà réalisées restent visibles par l'autre partie, sans votre nom, car ce sont aussi
              ses preuves. Cette action est définitive.
            </Text>

            <Text style={[styles.section, { color: colors.textSecondary }]}>À PROPOS</Text>
            <Glass borderRadius={radius.lg}>
              <LinkRow label="Version" icon="information-circle-outline" colors={colors} value="1.0.0" />
              <Divider colors={colors} />
              <LinkRow label="Évaluer Toupré" icon="star-outline" colors={colors} onPress={() => setDetail("rate")} />
            </Glass>
          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function ThemeRow({ label, value, current, onSelect, icon, colors }: any) {
  const active = current === value;
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={() => onSelect(value as ThemeMode)} testID={`theme-${value}`}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {active ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : (
        <View style={[styles.radio, { borderColor: colors.border }]} />
      )}
    </TouchableOpacity>
  );
}

function ToggleRow({ label, icon, defaultOn, colors }: any) {
  const [on, setOn] = useState(defaultOn);
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={on}
        onValueChange={setOn}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
        // Sur le web, activé, la pastille prend `activeThumbColor` (sarcelle par
        // défaut) et ignore `thumbColor` : on la force en blanc.
        {...({ activeThumbColor: "#fff" } as any)}
      />
    </View>
  );
}

function LinkRow({ label, icon, colors, onPress, value }: any) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {value ? (
        <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />;
}

const styles = StyleSheet.create({
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 16 },
  dangerTxt: { fontSize: 15, fontWeight: "600" },
  dangerNote: { fontSize: 12, lineHeight: 17, paddingHorizontal: 4, marginTop: 8 },
  section: { fontSize: 11, fontWeight: "600", letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  detailScroll: { padding: spacing.lg, paddingBottom: 80 },
  detailCard: { padding: spacing.lg, alignItems: "flex-start", gap: spacing.md },
  detailIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  detailTitle: { fontSize: 24, fontWeight: "700" },
  detailText: { fontSize: 14, lineHeight: 22 },
  stars: { flexDirection: "row", gap: 10, paddingVertical: spacing.sm },
  primaryBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700" },
});
