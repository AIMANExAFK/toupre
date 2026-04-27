import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/auth";
import { colors, spacing, radius, shadows } from "../src/theme";

export default function PaymentSuccess() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session_id) {
      setStatus("failed");
      return;
    }
    let cancelled = false;
    let count = 0;

    const poll = async () => {
      if (cancelled) return;
      count++;
      setAttempt(count);
      try {
        const res = await apiFetch(`/api/checkout/status/${session_id}`);
        if (cancelled) return;
        if (res.payment_status === "paid") {
          setStatus("paid");
          return;
        }
        if (res.status === "expired" || count > 8) {
          setStatus("pending");
          return;
        }
        setTimeout(poll, 2500);
      } catch (e) {
        if (count > 8) setStatus("failed");
        else setTimeout(poll, 2500);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  return (
    <SafeAreaView style={styles.container} testID="payment-success-screen">
      <View style={styles.content}>
        {status === "checking" && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Vérification du paiement…</Text>
            <Text style={styles.sub}>Tentative {attempt}/8</Text>
          </>
        )}

        {status === "paid" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
              <Ionicons name="checkmark" size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>Réservation confirmée !</Text>
            <Text style={styles.sub}>Votre paiement a bien été reçu. Nous vous avons envoyé un email récapitulatif.</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => router.replace("/(tabs)/bookings")}
              testID="see-bookings-btn"
            >
              <Text style={styles.btnText}>Voir mes locations</Text>
            </TouchableOpacity>
          </>
        )}

        {status === "pending" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time-outline" size={48} color={colors.warning} />
            </View>
            <Text style={styles.title}>Paiement en attente</Text>
            <Text style={styles.sub}>Le paiement n'est pas encore confirmé. Consultez vos locations pour suivre le statut.</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => router.replace("/(tabs)/bookings")}
            >
              <Text style={styles.btnText}>Voir mes locations</Text>
            </TouchableOpacity>
          </>
        )}

        {status === "failed" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
              <Ionicons name="close" size={48} color={colors.error} />
            </View>
            <Text style={styles.title}>Une erreur est survenue</Text>
            <Text style={styles.sub}>Veuillez réessayer ou contacter le support.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace("/(tabs)")}>
              <Text style={styles.btnText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 16 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, textAlign: "center", marginTop: 8 },
  sub: { fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: 16,
    ...shadows.primary,
  },
  btnText: { color: colors.surface, fontWeight: "700", fontSize: 15 },
});
