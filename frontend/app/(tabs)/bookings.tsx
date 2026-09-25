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
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass } from "../../src/Glass";
import { EnTeteSombre } from "../../src/EnTeteSombre";
import { Photo } from "../../src/Photo";

export default function Bookings() {
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [aNoter, setANoter] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [data, aNoter] = await Promise.all([
        apiFetch("/api/bookings/me", {}, token),
        // Locations terminées non encore notées (spec 004, FR-001)
        apiFetch("/api/reviews/pending", {}, token).catch(() => []),
      ]);
      setBookings(data);
      setANoter(new Set((aNoter || []).map((b: any) => b.listing_id)));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // L'état des lieux se saisit sur son propre écran (spec 001) : photos obligatoires,
  // état constaté et note. Plus d'envoi direct d'un constat vide depuis ici.
  const openConstat = (booking: any, kind: "pickup" | "return") =>
    router.push(`/booking/constat?id=${booking.id}&kind=${kind}`);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity accessibilityRole="button"
      onPress={() => item.listing && router.push(`/listing/${item.listing.id}`)}
      testID={`booking-${item.id}`}
      style={{ marginBottom: spacing.md }}
    >
      <Glass borderRadius={radius.lg}>
        <View style={styles.card}>
          {item.listing?.photos?.[0] && (
            <Photo uri={item.listing.photos[0]} largeur={110} style={styles.img} alt={`Photo de ${item.listing.title}`} icone="cube-outline" />
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
              <TouchableOpacity accessibilityRole="button"
                onPress={() => openConstat(item, "pickup")}
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
              <TouchableOpacity accessibilityRole="button"
                onPress={() => openConstat(item, "return")}
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
            {aNoter.has(item.listing_id) && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Noter ${item.listing?.title ?? "cette location"}`}
                onPress={() => router.push(`/booking/avis?listingId=${item.listing_id}&titre=${encodeURIComponent(item.listing?.title ?? "")}`)}
                style={[styles.flowBtn, { backgroundColor: colors.warning }]}
                testID={`noter-${item.id}`}
              >
                <Ionicons name="star-outline" size={15} color={colors.textInverse} />
                <Text style={[styles.flowBtnText, { color: colors.textInverse }]}>Noter</Text>
              </TouchableOpacity>
            )}
            {["active", "completed", "returned", "disputed"].includes(item.status) && (
              <TouchableOpacity accessibilityRole="button"
                onPress={() => router.push(`/booking/constats?id=${item.id}`)}
                style={styles.constatsLink}
                testID={`constats-${item.id}`}
              >
                <Ionicons name="images-outline" size={14} color={colors.primary} />
                <Text style={[styles.constatsTxt, { color: colors.primary }]}>États des lieux</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Glass>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="bookings-screen">
      <View style={{ flex: 1 }}>
          <EnTeteSombre
            titre="Mes locations"
            sousTitre="Vos réservations, en cours et passées."
          />

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
                  <TouchableOpacity accessibilityRole="button"
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
      </View>
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
  constatsLink: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: 10 },
  constatsTxt: { fontSize: 12.5, fontWeight: "600" },
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
  total: { fontSize: 17, fontWeight: "600" },
  flowBtn: { marginTop: 10, minHeight: 34, borderRadius: radius.sm + 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  flowBtnText: { fontSize: 13, fontWeight: "600" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 10 },
  emptyIcon: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  exploreBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md, marginTop: 16 },
  exploreBtnText: { fontWeight: "700", fontSize: 15 },
});
