import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius, shadows } from "../../src/theme";
import { Ionicons } from "@expo/vector-icons";

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} testID="welcome-screen">
      <View style={styles.heroBox}>
        <Image
          source={{ uri: "https://images.pexels.com/photos/5356726/pexels-photo-5356726.jpeg" }}
          style={styles.heroImg}
        />
        <View style={styles.overlay} />
        <View style={styles.brandBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="key" size={28} color={colors.surface} />
          </View>
          <Text style={styles.brandText}>LocaShare</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} testID="welcome-title">
          Louez tout, partout.
        </Text>
        <Text style={styles.subtitle}>
          Voitures, vélos, outils, tentes... Tout ce dont vous avez besoin, à portée de main.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(auth)/register")}
          testID="welcome-register-btn"
        >
          <Text style={styles.primaryBtnText}>Créer un compte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/(auth)/login")}
          testID="welcome-login-btn"
        >
          <Text style={styles.secondaryBtnText}>J'ai déjà un compte</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  heroBox: { height: "55%", position: "relative" },
  heroImg: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(91, 33, 182, 0.35)",
  },
  brandBox: {
    position: "absolute",
    top: spacing.xl + 20,
    left: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  brandText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 4,
  },
  content: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadows.primary,
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    backgroundColor: colors.surface2,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
