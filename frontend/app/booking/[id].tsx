import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError, apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { Calendrier, jourISO, depuisISO } from "../../src/Calendrier";
import { Photo } from "../../src/Photo";
import { compte } from "../../src/francais";

function formatISO(iso: string): string {
  return depuisISO(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function BookingFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [listing, setListing] = useState<any>(null);
  const [listingError, setListingError] = useState(false);

  const [debut, setDebut] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [indisponibles, setIndisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [data, dispo] = await Promise.all([
          apiFetch(`/api/listings/${id}`),
          apiFetch(`/api/listings/${id}/availability`),
        ]);
        setListing(data);
        // Réservé par d'autres + fermé par le propriétaire : pour le locataire
        // la distinction n'a pas d'importance, le jour est simplement pris.
        setIndisponibles([...(dispo.booked_dates || []), ...(dispo.blocked_dates || [])]);
      } catch (e: any) { Alert.alert("Erreur", e.message); setListingError(true); }
    })();
  }, [id]);

  if (listingError) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg, gap: 12 }]}>
        <Ionicons name="alert-circle-outline" size={52} color={colors.error} />
        <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "700" }}>Annonce introuvable</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!listing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const days = debut
    ? Math.round((depuisISO(fin || debut).getTime() - depuisISO(debut).getTime()) / 86400000) + 1
    : 0;
  const subtotal = days * Number(listing.price_per_day);
  const total = Math.round(subtotal * 100) / 100;

  const onReserve = async () => {
    if (!token) { router.push("/auth/otp"); return; }
    if (!debut) return;
    setLoading(true);
    try {
      await apiFetch(
        "/api/bookings",
        { method: "POST", body: JSON.stringify({
          listing_id: listing.id,
          start_date: debut,
          end_date: fin || debut,
        }) },
        token
      );
      if (Platform.OS === "web") {
        router.replace("/(tabs)/bookings");
        return;
      }
      Alert.alert(
        "Demande envoyée",
        "Le propriétaire doit confirmer la réservation. Le paiement se fera en espèces lors de la remise.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/bookings") }],
      );
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "KYC_REQUIRED" && e.action) {
        router.push(e.action as any);
      } else {
        Alert.alert("Erreur", e.message);
      }
    }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="booking-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity accessibilityLabel="Retour" accessibilityRole="button" onPress={() => router.back()} testID="back-btn">
              <Glass borderRadius={8} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Réservation</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Glass borderRadius={radius.lg} style={styles.itemShell}>
              <View style={styles.itemCard}>
                <Photo uri={listing.photos[0]} largeur={104} style={styles.itemImg} alt={`Photo de ${listing.title}`} icone="cube-outline" />
                <View style={{ flex: 1, padding: spacing.md }}>
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>{listing.title}</Text>
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>{listing.price_per_day}€ / jour</Text>
                </View>
              </View>
            </Glass>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dates de location</Text>
            <Glass borderRadius={radius.lg} style={styles.calShell}>
              <View style={{ padding: spacing.md }}>
                <Calendrier
                  indisponibles={indisponibles}
                  debut={debut}
                  fin={fin}
                  onPlage={(d, f) => { setDebut(d); setFin(f); }}
                />
              </View>
            </Glass>
            <Text style={[styles.calAide, { color: colors.textSecondary }]} testID="cal-resume">
              {!debut
                ? "Choisissez le premier jour de location."
                : !fin
                  ? `Du ${formatISO(debut)} — choisissez le dernier jour.`
                  : `Du ${formatISO(debut)} au ${formatISO(fin)} · ${compte(days, "jour")}`}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Récapitulatif</Text>
            <Glass borderRadius={radius.lg} style={styles.summaryShell}>
              <View style={styles.summary}>
                {debut ? (
                  <>
                    <Row label={`${listing.price_per_day}€ × ${compte(days, "jour")}`} value={`${subtotal.toFixed(2)}€`} colors={colors} />
                    <Row label="Frais de service" value="0,00€" colors={colors} />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Row label="À régler en espèces" value={`${total.toFixed(2)}€`} bold colors={colors} />
                  </>
                ) : (
                  // Sans dates, un total à 0,00€ n'a pas de sens : on invite plutôt
                  // à choisir la période, dont dépend tout le calcul.
                  <Text style={[styles.summaryVide, { color: colors.textSecondary }]} testID="recap-vide">
                    Choisissez vos dates pour voir le montant à régler.
                  </Text>
                )}
              </View>
            </Glass>

            <View style={[styles.notice, { backgroundColor: colors.warningBg || colors.successBg }]}>
              <Ionicons name="cash-outline" size={18} color={colors.warning || colors.success} />
              <Text style={[styles.noticeText, { color: colors.warning || colors.success }]}>
                Paiement en espèces entre le locataire et le propriétaire lors de la remise.
              </Text>
            </View>
          </ScrollView>

          <SafeAreaView edges={["bottom"]} style={[styles.bottomBar, { borderTopColor: colors.border }]}>
            <Glass borderRadius={0} style={{ padding: spacing.md }}>
              <TouchableOpacity accessibilityRole="button"
                style={[
                  styles.payBtn, { backgroundColor: colors.primary }, (loading || !debut) && { opacity: 0.55 },
                  shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 }),
                ]}
                onPress={onReserve} disabled={loading || !debut}
                accessibilityState={{ disabled: loading || !debut }} testID="reserve-btn"
              >
                {loading ? <ActivityIndicator color={colors.textInverse} /> : (
                  <>
              <Ionicons name="calendar-outline" size={18} color={colors.textInverse} />
                    <Text style={[styles.payText, { color: colors.textInverse }]}>Demander la réservation</Text>
                  </>
                )}
              </TouchableOpacity>
            </Glass>
          </SafeAreaView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function Row({ label, value, bold, colors }: any) {
  return (
    <View style={styles.row}>
      <Text style={[bold ? styles.bold : styles.rowLabel, { color: bold ? colors.textPrimary : colors.textSecondary }]}>{label}</Text>
      <Text style={[bold ? styles.bold : styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900" },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  itemShell: { borderWidth: 1 },
  itemCard: { flexDirection: "row", overflow: "hidden" },
  itemImg: { width: 104, height: 104 },
  itemTitle: { fontSize: 15, fontWeight: "900", lineHeight: 20 },
  itemPrice: { fontSize: 14, fontWeight: "900", marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "900", marginTop: spacing.lg, marginBottom: spacing.sm },
  calShell: { overflow: "hidden" },
  calAide: { fontSize: 13, textAlign: "center", marginTop: spacing.sm, fontWeight: "600" },
  summaryShell: { borderWidth: 1 },
  summary: { padding: spacing.md },
  summaryVide: { fontSize: 13.5, lineHeight: 19, textAlign: "center", paddingVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  bold: { fontSize: 17, fontWeight: "900" },
  divider: { height: 1, marginVertical: 8 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  noticeText: { fontSize: 14, fontWeight: "700" },
  bottomBar: { borderTopWidth: 1 },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17, borderRadius: radius.md },
  payText: { fontWeight: "800", fontSize: 16 },
});
