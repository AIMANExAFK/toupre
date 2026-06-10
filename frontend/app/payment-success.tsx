import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

export default function PaymentSuccess() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="cash-booking-screen">
      <GradientBg>
        <SafeAreaView style={styles.content}>
          <Glass borderRadius={50} style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
            <Ionicons name="calendar-outline" size={46} color={colors.success} />
          </Glass>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Demande envoyée</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {"Le propriétaire doit confirmer la réservation. Le règlement se fera ensuite en espèces lors de la remise de l'objet."}
          </Text>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
            ]}
            onPress={() => router.replace("/(tabs)/bookings")}
            testID="see-bookings-btn"
          >
            <Text style={[styles.btnText, { color: colors.textInverse }]}>Voir mes locations</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 16 },
  iconCircle: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginTop: 8 },
  sub: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.md, marginTop: 16 },
  btnText: { fontWeight: "800", fontSize: 15 },
});
