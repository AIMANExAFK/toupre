import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function Bookings() {
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await apiFetch("/api/bookings/me", {}, token);
      setBookings(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createInspection = async (booking: any, kind: "pickup" | "return") => {
    if (!token) return;
    setUpdatingId(booking.id);
    try {
      await apiFetch(
        `/api/bookings/${booking.id}/inspection`,
        {
          method: "POST",
          body: JSON.stringify({
            kind,
            condition: "ok",
            notes: kind === "pickup" ? "Remise confirmée par le locataire." : "Retour confirmé par le locataire.",
            photos: [],
          }),
        },
        token,
      );
      await load();
      Alert.alert(kind === "pickup" ? "Location démarrée" : "Retour confirmé");
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => item.listing && router.push(`/listing/${item.listing.id}`)}
      testID={`booking-${item.id}`}
      style={{ marginBottom: spacing.md }}
    >
      <Glass borderRadius={radius.lg}>
        <View style={styles.card}>
          {item.listing?.photos?.[0] && (
            <Image source={{ uri: item.listing.photos[0] }} style={styles.img} />
          )}
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.listing?.title || "Annonce supprimée"}
            </Text>
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.dates, { color: colors.textSecondary }]}>
                {formatDate(item.start_date)} → {formatDate(item.end_date)}
              </Text>
            </View>
            <View style={styles.bottomRow}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusBg(item.status, colors) },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: statusColor(item.status, colors) }]} />
                <Text style={[styles.statusText, { color: statusColor(item.status, colors) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
              <Text style={[styles.total, { color: colors.textPrimary }]}>{item.total_price}€</Text>
            </View>
            {item.status === "confirmed" || item.status === "paid" ? (
              <TouchableOpacity
                onPress={() => createInspection(item, "pickup")}
                disabled={updatingId === item.id}
                style={[styles.flowBtn, { backgroundColor: colors.primary }]}
                testID={`pickup-${item.id}`}
              >
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={15} color={colors.textInverse} />
                    <Text style={[styles.flowBtnText, { color: colors.textInverse }]}>Débuter</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : item.status === "active" ? (
              <TouchableOpacity
                onPress={() => createInspection(item, "return")}
                disabled={updatingId === item.id}
                style={[styles.flowBtn, { backgroundColor: colors.success }]}
                testID={`return-${item.id}`}
              >
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={15} color={colors.textInverse} />
                    <Text style={[styles.flowBtnText, { color: colors.textInverse }]}>Retour</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Glass>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="bookings-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Mes locations</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Glass borderRadius={50} style={[styles.emptyIcon, { width: 100, height: 100 }]}>
                    <Ionicons name="calendar-outline" size={48} color={colors.primary} />
                  </Glass>
                  <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                    Aucune location pour le moment
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Découvrez les annonces disponibles près de chez vous
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.exploreBtn,
                      { backgroundColor: colors.primary },
                      shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
                    ]}
                    onPress={() => router.push("/(tabs)")}
                    testID="empty-explore-btn"
                  >
                    <Text style={[styles.exploreBtnText, { color: colors.textInverse }]}>
                      Explorer les annonces
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function statusLabel(s: string) {
  if (s === "paid") return "Payée";
  if (s === "confirmed") return "Acceptée";
  if (s === "active") return "En cours";
  if (s === "completed") return "Terminée";
  if (s === "returned") return "Retournée";
  if (s === "refused") return "Refusée";
  if (s === "disputed") return "Litige";
  if (s === "pending") return "En attente";
  if (s === "cancelled") return "Annulée";
  return s;
}

function statusColor(s: string, colors: any) {
  if (s === "paid" || s === "completed" || s === "returned") return colors.success;
  if (s === "confirmed" || s === "active") return colors.primary;
  if (s === "cancelled" || s === "refused" || s === "disputed") return colors.error;
  return colors.warning;
}

function statusBg(s: string, colors: any) {
  if (s === "paid" || s === "completed" || s === "returned") return colors.successBg;
  if (s === "confirmed" || s === "active") return colors.primaryTint;
  if (s === "cancelled" || s === "refused" || s === "disputed") return colors.errorBg;
  return colors.warningBg;
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 30,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    letterSpacing: -1,
  },
  list: { padding: spacing.lg, flexGrow: 1, paddingBottom: 140 },
  card: { flexDirection: "row", overflow: "hidden" },
  img: { width: 110, height: 110 },
  body: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  dates: { fontSize: 13 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  total: { fontSize: 17, fontWeight: "800" },
  flowBtn: { marginTop: 10, minHeight: 34, borderRadius: radius.sm + 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  flowBtnText: { fontSize: 13, fontWeight: "800" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 10 },
  emptyIcon: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  exploreBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md, marginTop: 16 },
  exploreBtnText: { fontWeight: "700", fontSize: 15 },
});
