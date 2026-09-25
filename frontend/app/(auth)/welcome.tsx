import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { Photo } from "../../src/Photo";
import { ToupreMark } from "../../src/Brand";

export default function Welcome() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="welcome-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          {/* Hauteur en % CSS : useWindowDimensions pouvait renvoyer 0 à l'hydratation (web) */}
          <View style={[styles.heroBox, { height: "58%" }]}>
            <Photo
              uri="https://images.pexels.com/photos/5356726/pexels-photo-5356726.jpeg"
              largeur={430}
              style={styles.heroImg}
              alt=""
            />
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]} />

            <View style={styles.brandBox}>
              <Glass borderRadius={20} style={styles.brandPill}>
                <View style={styles.brandInner}>
                  <ToupreMark size={30} color={colors.primary} />
                  <Text dataSet={{ brandFont: "1" }} style={[styles.brandText, { color: colors.textInverse }]}>toupré</Text>
                </View>
              </Glass>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>Toupré</Text>
              <Text style={styles.heroTitle}>Tout se loue, tout près.</Text>
            </View>

            <View style={styles.heroFooter}>
              <Glass borderRadius={radius.md} style={styles.tagPill}>
                <View style={styles.tagInner}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.textInverse} />
                  <Text style={[styles.tag, { color: colors.textInverse }]}>
                    Contact vérifié, paiement en espèces
                  </Text>
                </View>
              </Glass>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }]} testID="welcome-title">
              Trouvez, réservez, récupérez.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Réservez une voiture, un vélo, un outil ou du matériel pour quelques heures ou quelques jours, sans achat inutile.
            </Text>

            <TouchableOpacity accessibilityRole="button"
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                shadowStyle({ color: colors.primary, opacity: 0.45, radius: 22, offsetY: 10 }),
              ]}
              onPress={() => router.push("/auth/otp")}
              testID="welcome-identify-btn"
            >
              <Ionicons name="finger-print" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />
              <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>
                {"Commencer"}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.reassurance, { color: colors.textTertiary }]} testID="welcome-reassurance">
              Nouveau ou déjà inscrit : le même code par email vous connecte.
              Aucun mot de passe à retenir.
            </Text>
          </View>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  reassurance: { fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 14, paddingHorizontal: 6 },
  heroBox: { position: "relative", overflow: "hidden", borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  heroImg: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject },
  brandBox: { position: "absolute", top: 16, left: 16 },
  brandPill: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  brandInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  heroCopy: { position: "absolute", left: 20, right: 20, bottom: 76 },
  heroKicker: { color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  heroTitle: { color: "#FFFFFF", fontSize: 34, lineHeight: 38, fontWeight: "700", marginTop: 6 },
  heroFooter: { position: "absolute", bottom: 24, left: 20, right: 20 },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(7, 19, 19, 0.58)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  tagInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { fontSize: 12, fontWeight: "600" },
  content: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: 25, fontWeight: "700", letterSpacing: 0, marginBottom: spacing.sm, lineHeight: 30 },
  subtitle: { fontSize: 15, lineHeight: 23, marginBottom: spacing.xl },
  primaryBtn: { paddingVertical: 17, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", marginBottom: spacing.md },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
});
