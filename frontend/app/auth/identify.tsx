import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function IdentifyHub() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="identify-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Connexion</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginTop: spacing.lg }}>
              <View style={[styles.heroIco, { backgroundColor: colors.primaryTint }]}>
                <Ionicons name="shield-checkmark-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Vérification à chaque connexion</Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Entrez votre email et votre numéro. Vous recevez un code à 6 chiffres à renseigner pour accéder à LocaShare.
              </Text>
            </View>

            <TouchableOpacity onPress={() => router.push("/auth/otp")} activeOpacity={0.86} testID="auth-otp">
              <Glass borderRadius={radius.lg} style={[styles.methodCard, shadowStyle({ color: colors.primary, opacity: 0.18, radius: 16, offsetY: 5 })]}>
                <View style={[styles.methodIco, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="mail-unread-outline" size={23} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>Recevoir un code</Text>
                  <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                    Email + téléphone obligatoires. Aucun mot de passe nécessaire.
                  </Text>
                  <View style={[styles.tag, { backgroundColor: colors.successBg }]}>
                    <Text style={[styles.tagText, { color: colors.success }]}>CONTACT VÉRIFIÉ</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.textTertiary} />
              </Glass>
            </TouchableOpacity>

            <View style={[styles.disclaimer, { backgroundColor: colors.surface2 }]}>
              <Ionicons name="information-circle-outline" size={17} color={colors.textSecondary} />
              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                {"Cette vérification confirme que l'utilisateur possède bien son email et son téléphone. Elle ne remplace pas une vérification officielle d'identité."}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { padding: spacing.lg, paddingBottom: 80, gap: spacing.lg },
  heroIco: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { fontSize: 25, fontWeight: "900", textAlign: "center" },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8, paddingHorizontal: spacing.sm },
  methodCard: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 12 },
  methodIco: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  methodTitle: { fontSize: 15, fontWeight: "900" },
  methodDesc: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  tag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 9 },
  tagText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  disclaimer: { flexDirection: "row", gap: 8, padding: spacing.md, borderRadius: radius.md },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
