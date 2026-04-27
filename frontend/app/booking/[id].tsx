import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiFetch, useAuth, BACKEND_URL } from "../../src/auth";
import { colors, spacing, radius, shadows } from "../../src/theme";

export default function BookingFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

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
      } catch (e: any) {
        Alert.alert("Erreur", e.message);
      }
    })();
  }, [id]);

  if (!listing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const days = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const subtotal = days * Number(listing.price_per_day);
  const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;

  const onPay = async () => {
    if (!token) {
      router.push("/(auth)/login");
      return;
    }
    setLoading(true);
    try {
      const booking = await apiFetch(
        "/api/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            listing_id: listing.id,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          }),
        },
        token
      );

      const origin = BACKEND_URL || "https://locashare.app";
      const checkout = await apiFetch(
        "/api/checkout/session",
        {
          method: "POST",
          body: JSON.stringify({ booking_id: booking.id, origin_url: origin }),
        },
        token
      );

      // Open Stripe checkout
      await WebBrowser.openBrowserAsync(checkout.url);

      // After user closes browser, navigate to payment-success to poll status
      router.replace(`/payment-success?session_id=${checkout.session_id}`);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="booking-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réservation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.itemCard}>
          <Image source={{ uri: listing.photos[0] }} style={styles.itemImg} />
          <View style={{ flex: 1, padding: spacing.md }}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {listing.title}
            </Text>
            <Text style={styles.itemPrice}>{listing.price_per_day}€ / jour</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dates de location</Text>

        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setShowStartPicker(true)}
          testID="start-date-btn"
        >
          <View style={styles.dateIcon}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>Du</Text>
            <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setShowEndPicker(true)}
          testID="end-date-btn"
        >
          <View style={styles.dateIcon}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>Au</Text>
            <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={today}
            onChange={(_, d) => {
              setShowStartPicker(Platform.OS === "ios");
              if (d) {
                setStartDate(d);
                if (d >= endDate) {
                  const newEnd = new Date(d);
                  newEnd.setDate(d.getDate() + 1);
                  setEndDate(newEnd);
                }
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={startDate}
            onChange={(_, d) => {
              setShowEndPicker(Platform.OS === "ios");
              if (d) setEndDate(d);
            }}
          />
        )}

        <Text style={styles.sectionTitle}>Récapitulatif</Text>
        <View style={styles.summary}>
          <Row label={`${listing.price_per_day}€ × ${days} jours`} value={`${subtotal.toFixed(2)}€`} />
          <Row label="Frais de service" value={`${serviceFee.toFixed(2)}€`} />
          <View style={styles.divider} />
          <Row label="Total" value={`${total.toFixed(2)}€`} bold />
        </View>

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
          <Text style={styles.noticeText}>Paiement sécurisé via Stripe</Text>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payBtn, loading && { opacity: 0.7 }]}
          onPress={onPay}
          disabled={loading}
          testID="pay-btn"
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color={colors.surface} />
              <Text style={styles.payText}>Payer {total.toFixed(2)}€</Text>
            </>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  itemCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  itemImg: { width: 100, height: 100, backgroundColor: colors.surface2 },
  itemTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  itemPrice: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 4 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.card,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabel: { fontSize: 12, color: colors.textSecondary },
  dateValue: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginTop: 2 },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, color: colors.textPrimary },
  bold: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successBg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  noticeText: { color: colors.success, fontSize: 14, fontWeight: "600" },
  bottomBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    ...shadows.primary,
  },
  payText: { color: colors.surface, fontWeight: "700", fontSize: 16 },
});
