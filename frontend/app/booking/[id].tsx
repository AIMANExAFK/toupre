import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiFetch, useAuth, BACKEND_URL } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function BookingFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [listing, setListing] = useState<any>(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(dayAfter);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/api/listings/${id}`);
        setListing(data);
      } catch (e: any) { Alert.alert("Erreur", e.message); }
    })();
  }, [id]);

  if (!listing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const subtotal = days * Number(listing.price_per_day);
  const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;

  const onPay = async () => {
    if (!token) { router.push("/(auth)/login"); return; }
    setLoading(true);
    try {
      const booking = await apiFetch(
        "/api/bookings",
        { method: "POST", body: JSON.stringify({
          listing_id: listing.id,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        }) },
        token
      );
      const origin = BACKEND_URL || "https://locashare.app";
      const checkout = await apiFetch(
        "/api/checkout/session",
        { method: "POST", body: JSON.stringify({ booking_id: booking.id, origin_url: origin }) },
        token
      );
      await WebBrowser.openBrowserAsync(checkout.url);
      router.replace(`/payment-success?session_id=${checkout.session_id}`);
    } catch (e: any) { Alert.alert("Erreur", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="booking-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} testID="back-btn">
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Réservation</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Glass borderRadius={radius.lg}>
              <View style={styles.itemCard}>
                <Image source={{ uri: listing.photos[0] }} style={styles.itemImg} />
                <View style={{ flex: 1, padding: spacing.md }}>
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>{listing.title}</Text>
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>{listing.price_per_day}€ / jour</Text>
                </View>
              </View>
            </Glass>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dates de location</Text>
            <TouchableOpacity onPress={() => setShowStartPicker(true)} testID="start-date-btn" style={{ marginBottom: spacing.sm }}>
              <Glass borderRadius={radius.md}>
                <View style={styles.dateRow}>
                  <View style={[styles.dateIcon, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Du</Text>
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{formatDate(startDate)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </Glass>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowEndPicker(true)} testID="end-date-btn">
              <Glass borderRadius={radius.md}>
                <View style={styles.dateRow}>
                  <View style={[styles.dateIcon, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Au</Text>
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{formatDate(endDate)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </Glass>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate} mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={today}
                onChange={(_, d) => {
                  setShowStartPicker(Platform.OS === "ios");
                  if (d) {
                    setStartDate(d);
                    if (d >= endDate) {
                      const newEnd = new Date(d); newEnd.setDate(d.getDate() + 1); setEndDate(newEnd);
                    }
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate} mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={startDate}
                onChange={(_, d) => { setShowEndPicker(Platform.OS === "ios"); if (d) setEndDate(d); }}
              />
            )}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Récapitulatif</Text>
            <Glass borderRadius={radius.lg}>
              <View style={styles.summary}>
                <Row label={`${listing.price_per_day}€ × ${days} jours`} value={`${subtotal.toFixed(2)}€`} colors={colors} />
                <Row label="Frais de service (10%)" value={`${serviceFee.toFixed(2)}€`} colors={colors} />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Row label="Total" value={`${total.toFixed(2)}€`} bold colors={colors} />
              </View>
            </Glass>

            <View style={[styles.notice, { backgroundColor: colors.successBg }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={[styles.noticeText, { color: colors.success }]}>Paiement sécurisé via Stripe</Text>
            </View>
          </ScrollView>

          <SafeAreaView edges={["bottom"]} style={[styles.bottomBar, { borderTopColor: colors.border }]}>
            <Glass borderRadius={0} style={{ padding: spacing.md }}>
              <TouchableOpacity
                style={[
                  styles.payBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 },
                  shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 }),
                ]}
                onPress={onPay} disabled={loading} testID="pay-btn"
              >
                {loading ? <ActivityIndicator color={colors.textInverse} /> : (
                  <>
                    <Ionicons name="lock-closed" size={18} color={colors.textInverse} />
                    <Text style={[styles.payText, { color: colors.textInverse }]}>Payer {total.toFixed(2)}€</Text>
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
function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  itemCard: { flexDirection: "row", overflow: "hidden" },
  itemImg: { width: 100, height: 100 },
  itemTitle: { fontSize: 15, fontWeight: "700" },
  itemPrice: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  dateRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  dateIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dateLabel: { fontSize: 12 },
  dateValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  summary: { padding: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  bold: { fontSize: 17, fontWeight: "800" },
  divider: { height: 1, marginVertical: 8 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  noticeText: { fontSize: 14, fontWeight: "700" },
  bottomBar: { borderTopWidth: 1 },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17, borderRadius: radius.md },
  payText: { fontWeight: "800", fontSize: 16 },
});
