import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

export default function PaymentSuccess() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session_id) { setStatus("failed"); return; }
    let cancelled = false;
    let count = 0;

    const poll = async () => {
      if (cancelled) return;
      count++; setAttempt(count);
      try {
        const res = await apiFetch(`/api/checkout/status/${session_id}`);
        if (cancelled) return;
        if (res.payment_status === "paid") { setStatus("paid"); return; }
        if (res.status === "expired" || count > 8) { setStatus("pending"); return; }
        setTimeout(poll, 2500);
      } catch {
        if (count > 8) setStatus("failed");
        else setTimeout(poll, 2500);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [session_id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="payment-success-screen">
      <GradientBg>
        <SafeAreaView style={styles.content}>
          {status === "checking" && (
            <>
              <Glass borderRadius={50} style={styles.iconCircle}>
                <ActivityIndicator size="large" color={colors.primary} />
              </Glass>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Vérification du paiement…</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>Tentative {attempt}/8</Text>
            </>
          )}
          {status === "paid" && (
            <>
              <Glass borderRadius={50} style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
                <Ionicons name="checkmark" size={48} color={colors.success} />
              </Glass>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Réservation confirmée !</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                Votre paiement a bien été reçu. Vous trouverez les détails dans Mes locations.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
                onPress={() => router.replace("/(tabs)/bookings")}
                testID="see-bookings-btn"
              >
                <Text style={[styles.btnText, { color: colors.textInverse }]}>Voir mes locations</Text>
              </TouchableOpacity>
            </>
          )}
          {status === "pending" && (
            <>
              <Glass borderRadius={50} style={[styles.iconCircle, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="time-outline" size={48} color={colors.warning} />
              </Glass>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Paiement en attente</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                {"Le paiement n'est pas encore confirmé. Consultez Mes locations pour suivre le statut."}
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.replace("/(tabs)/bookings")}>
                <Text style={[styles.btnText, { color: colors.textInverse }]}>Voir mes locations</Text>
              </TouchableOpacity>
            </>
          )}
          {status === "failed" && (
            <>
              <Glass borderRadius={50} style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
                <Ionicons name="close" size={48} color={colors.error} />
              </Glass>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Une erreur est survenue</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>Veuillez réessayer ou contacter le support.</Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.replace("/(tabs)")}>
                <Text style={[styles.btnText, { color: colors.textInverse }]}>{"Retour à l'accueil"}</Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 16 },
  iconCircle: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginTop: 8, letterSpacing: -0.5 },
  sub: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.md, marginTop: 16 },
  btnText: { fontWeight: "800", fontSize: 15 },
});
