import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";
import { EnTeteSombre } from "../src/EnTeteSombre";

type Referral = { id: string; name: string; joined_at: string; has_booked: boolean };

export default function ReferralScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const colors = useColors();
  const [data, setData] = useState<{
    referral_code: string;
    credit_balance: number;
    referrals: Referral[];
    reward_amount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/api/referral/me", {}, token);
        setData(r);
      } catch (e) { console.log(e); }
    })();
  }, [token]);

  const copyCode = async () => {
    if (!data) return;
    try {
      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(data.referral_code);
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    if (!data) return;
    const msg = `Inscris-toi sur Toupré avec mon code ${data.referral_code} et reçois 10€ offerts ! https://locashare.fr`;
    try {
      if (Platform.OS === "web" && (navigator as any).share) {
        await (navigator as any).share({ title: "Toupré", text: msg });
      } else {
        await Share.share({ message: msg });
      }
    } catch {}
  };

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textSecondary }}>Chargement…</Text>
      </View>
    );
  }

  const validated = data.referrals.filter((r) => r.has_booked).length;
  const pending = data.referrals.length - validated;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <EnTeteSombre
            titre="Parrainage"
            retour={() => router.back()}
          />

          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 }}>

            {/* Hero */}
            <Glass borderRadius={radius.lg} style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryTint }]}>
                <Ionicons name="gift" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Parrainez et gagnez {data.reward_amount}€
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                {"Pour chaque ami qui s'inscrit avec votre code, vous recevez "}{data.reward_amount}€ de crédit et lui aussi !
              </Text>
            </Glass>

            {/* Code */}
            <Glass borderRadius={radius.lg} style={styles.codeBox}>
              <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Votre code de parrainage</Text>
              <View style={styles.codeRow}>
                <Text style={[styles.code, { color: colors.primary }]} selectable>
                  {data.referral_code}
                </Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={copied ? "Code copié" : "Copier le code de parrainage"} onPress={copyCode} style={[styles.copyBtn, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={copied ? colors.success : colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity accessibilityRole="button"
                onPress={shareCode}
                style={[styles.shareBtn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
              >
                <Ionicons name="share-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.shareText, { color: colors.textInverse }]}>Partager mon code</Text>
              </TouchableOpacity>
            </Glass>

            {/* Stats */}
            <View style={styles.stats}>
              <Glass borderRadius={radius.lg} style={styles.statCard}>
                <Text style={[styles.statVal, { color: colors.primary }]}>{data.credit_balance}€</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Crédit disponible</Text>
              </Glass>
              <Glass borderRadius={radius.lg} style={styles.statCard}>
                <Text style={[styles.statVal, { color: colors.textPrimary }]}>{validated}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Filleuls validés</Text>
              </Glass>
              <Glass borderRadius={radius.lg} style={styles.statCard}>
                <Text style={[styles.statVal, { color: colors.warning }]}>{pending}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En attente</Text>
              </Glass>
            </View>

            {/* How it works */}
            <Glass borderRadius={radius.lg} style={styles.howBox}>
              <Text style={[styles.howTitle, { color: colors.textPrimary }]}>Comment ça marche</Text>
              {[
                { n: "1", t: "Partagez votre code", d: "Envoyez-le à un ami par message, email ou réseaux sociaux." },
                { n: "2", t: "Il s'inscrit", d: "Votre ami crée son compte avec votre code. Il reçoit 10€ tout de suite." },
                { n: "3", t: "Vous gagnez 10€", d: "Dès qu'il a effectué sa 1ère réservation, vous recevez 10€ de crédit." },
              ].map((s) => (
                <View key={s.n} style={styles.howStep}>
                  <View style={[styles.howNum, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.howNumText, { color: colors.textInverse }]}>{s.n}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.howStepTitle, { color: colors.textPrimary }]}>{s.t}</Text>
                    <Text style={[styles.howStepDesc, { color: colors.textSecondary }]}>{s.d}</Text>
                  </View>
                </View>
              ))}
            </Glass>

            {/* List of referrals */}
            <Glass borderRadius={radius.lg} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Mes filleuls ({data.referrals.length})
              </Text>
              {data.referrals.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun filleul pour le moment. Partagez votre code !
                </Text>
              ) : (
                data.referrals.map((r) => (
                  <View key={r.id} style={[styles.refRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.refAv, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.refAvText, { color: colors.textInverse }]}>
                        {r.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.refName, { color: colors.textPrimary }]}>{r.name}</Text>
                      <Text style={[styles.refDate, { color: colors.textSecondary }]}>
                        Inscrit le {new Date(r.joined_at).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                    {r.has_booked ? (
                      <View style={[styles.statusPill, { backgroundColor: colors.successBg }]}>
                        <Ionicons name="checkmark" size={12} color={colors.success} />
                        <Text style={[styles.statusText, { color: colors.success }]}>+10€</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusPill, { backgroundColor: colors.surface2 }]}>
                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>En attente</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </Glass>
          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, alignItems: "center", gap: 6 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  heroTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", letterSpacing: -0.5 },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: spacing.sm },
  codeBox: { padding: spacing.lg, alignItems: "center", gap: spacing.md },
  codeLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  code: { fontSize: 30, fontWeight: "700", letterSpacing: 2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  copyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 28, borderRadius: radius.md, alignSelf: "stretch", justifyContent: "center" },
  shareText: { fontSize: 15, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, padding: spacing.md, alignItems: "center", gap: 4 },
  statVal: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  howBox: { padding: spacing.lg },
  howTitle: { fontSize: 16, fontWeight: "600", marginBottom: spacing.md },
  howStep: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8 },
  howNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  howNumText: { fontSize: 13, fontWeight: "700" },
  howStepTitle: { fontSize: 14, fontWeight: "700" },
  howStepDesc: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  section: { padding: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: "600", marginBottom: spacing.sm },
  emptyText: { fontSize: 13, textAlign: "center", padding: spacing.lg },
  refRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1 },
  refAv: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  refAvText: { fontSize: 14, fontWeight: "600" },
  refName: { fontSize: 14, fontWeight: "700" },
  refDate: { fontSize: 11, marginTop: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "600" },
});
