import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function Welcome() {
  const router = useRouter();
  const colors = useColors();
  const { height } = useWindowDimensions();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="welcome-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={[styles.heroBox, { height: height * 0.55 }]}>
            <Image
              source={{ uri: "https://images.pexels.com/photos/5356726/pexels-photo-5356726.jpeg" }}
              style={styles.heroImg}
            />
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]} />

            <View style={styles.brandBox}>
              <Glass borderRadius={20} style={styles.brandPill}>
                <View style={styles.brandInner}>
                  <View style={[styles.logoCircle, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.5, radius: 18, offsetY: 6 })]}>
                    <Ionicons name="key" size={20} color={colors.textInverse} />
                  </View>
                  <Text style={[styles.brandText, { color: colors.textInverse }]}>LocaShare</Text>
                </View>
              </Glass>
            </View>

            <View style={styles.heroFooter}>
              <Glass borderRadius={radius.md} style={styles.tagPill}>
                <View style={styles.tagInner}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.textInverse} />
                  <Text style={[styles.tag, { color: colors.textInverse }]}>
                    Objets vérifiés, paiement sécurisé
                  </Text>
                </View>
              </Glass>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }]} testID="welcome-title">
              LocaShare{"\n"}
              <Text style={{ color: colors.primary }}>louez local.</Text>
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Réservez une voiture, un vélo, un outil ou du matériel pour quelques heures ou quelques jours, sans achat inutile.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                shadowStyle({ color: colors.primary, opacity: 0.45, radius: 22, offsetY: 10 }),
              ]}
              onPress={() => router.push("/auth/identify")}
              testID="welcome-identify-btn"
            >
              <Ionicons name="finger-print" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />
              <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>
                {"Commencer · M'identifier"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/login")} testID="welcome-login-btn">
              <Glass borderRadius={radius.md} style={styles.secondaryGlass}>
                <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                  {"J'ai déjà un compte"}
                </Text>
              </Glass>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBox: { position: "relative", overflow: "hidden", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  heroImg: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject },
  brandBox: { position: "absolute", top: 16, left: 16 },
  brandPill: { paddingHorizontal: 14, paddingVertical: 8 },
  brandInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  heroFooter: { position: "absolute", bottom: 24, alignSelf: "center" },
  tagPill: { paddingHorizontal: 16, paddingVertical: 10 },
  tagInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { fontSize: 12, fontWeight: "600" },
  content: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: 38, fontWeight: "900", letterSpacing: -1, marginBottom: spacing.sm, lineHeight: 44 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: spacing.xl },
  primaryBtn: { paddingVertical: 17, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexDirection: "row", marginBottom: spacing.md },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  secondaryGlass: { paddingVertical: 17, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 16, fontWeight: "700", textAlign: "center" },
});
