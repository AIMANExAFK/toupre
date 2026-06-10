import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, radius, shadowStyle, useColors } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function FranceConnectCallback() {
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/auth/otp"), 350);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="legacy-auth-redirect-screen">
      <GradientBg>
        <SafeAreaView style={styles.content}>
          <Glass borderRadius={50} style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name="keypad-outline" size={44} color={colors.primary} />
          </Glass>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Connexion par code</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Pour le moment, LocaShare utilise un code envoyé sur email et téléphone à chaque connexion.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/auth/otp")}
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
            ]}
          >
            <Text style={[styles.btnText, { color: colors.textInverse }]}>Continuer</Text>
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
  sub: { fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 16 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.sm },
  btnText: { fontSize: 15, fontWeight: "800" },
});
