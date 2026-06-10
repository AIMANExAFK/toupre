import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

export default function Payments() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="payments-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Paiement</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginBottom: spacing.md }}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryTint }, shadowStyle({ color: colors.primary, opacity: 0.16, radius: 18, offsetY: 8 })]}>
                <Ionicons name="cash-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Paiement en espèces</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Pour le moment, Toupré ne traite aucun paiement en ligne. Le locataire règle directement le propriétaire lors de la remise.
              </Text>
            </View>

            <Glass borderRadius={radius.lg} style={styles.rulesCard}>
              <Rule icon="checkmark-circle-outline" title="Avant la remise" text="Le propriétaire accepte la demande de réservation dans l'app." colors={colors} />
              <Rule icon="cash-outline" title="À la remise" text="Le locataire paie le montant affiché en espèces." colors={colors} />
              <Rule icon="clipboard-outline" title="État des lieux" text="Les deux parties confirment le départ et le retour depuis la réservation." colors={colors} />
            </Glass>

            <View style={[styles.notice, { backgroundColor: colors.warningBg || colors.primaryTint }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning || colors.primary} />
              <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
                {"Gardez une trace dans l'app: messages, réservation acceptée et état des lieux."}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function Rule({ icon, title, text, colors }: any) {
  return (
    <View style={styles.rule}>
      <View style={[styles.ruleIcon, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  scroll: { padding: spacing.lg, paddingBottom: 56 },
  heroIcon: { width: 78, height: 78, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 24, fontWeight: "900", textAlign: "center", letterSpacing: 0 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8 },
  rulesCard: { padding: spacing.md, gap: spacing.md, borderWidth: 1 },
  rule: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  ruleIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  ruleTitle: { fontSize: 14, fontWeight: "900" },
  ruleText: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  noticeText: { fontSize: 13, lineHeight: 18, fontWeight: "700", flex: 1 },
});
