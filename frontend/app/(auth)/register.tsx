import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function RegisterRedirect() {
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/auth/otp"), 250);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="register-redirect-screen">
      <GradientBg>
        <SafeAreaView style={styles.content}>
          <Glass borderRadius={50} style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name="shield-checkmark-outline" size={42} color={colors.primary} />
          </Glass>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Créer un accès vérifié</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Un code envoyé sur email et téléphone suffit pour créer ou retrouver votre compte.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/auth/otp")}
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
            ]}
          >
            <Text style={[styles.btnText, { color: colors.textInverse }]}>Recevoir un code</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 16 },
  iconCircle: { width: 104, height: 104, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  sub: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },
  btn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.sm },
  btnText: { fontSize: 15, fontWeight: "800" },
});
