import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

type Tab = "items" | "requests";

export default function MyItems() {
  const { token, user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("items");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setRefreshing(false); return; }
    try {
      const [data, bkgs] = await Promise.all([
        apiFetch("/api/listings/owner/me", {}, token),
        apiFetch("/api/bookings/owner/me", {}, token).catch(() => []),
      ]);
      setItems(data);
      setBookings(bkgs);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (id: string) => {
    Alert.alert("Supprimer ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/listings/${id}`, { method: "DELETE" }, token);
            load();
          } catch (e: any) { Alert.alert("Erreur", e.message); }
        },
      },
    ]);
  };

  const updateBooking = async (id: string, status: "confirmed" | "refused" | "cancelled" | "completed") => {
    try {
      await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }, token);
      load();
    } catch (e: any) { Alert.alert("Erreur", e.message); }
  };

  const pendingCount = bookings.filter(b => b.status === "pending").length;

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientBg>
          <SafeAreaView style={styles.empty}>
            <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
            </Glass>
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Connectez-vous</Text>
          </SafeAreaView>
        </GradientBg>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="myitems-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Mes biens</Text>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setTab("items")}
              style={[styles.tab, tab === "items" && { borderBottomColor: colors.primary }]}
              testID="tab-items"
            >
              <Text style={[styles.tabText, { color: tab === "items" ? colors.primary : colors.textSecondary }]}>
                Annonces ({items.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab("requests")}
              style={[styles.tab, tab === "requests" && { borderBottomColor: colors.primary }]}
              testID="tab-requests"
            >
              <Text style={[styles.tabText, { color: tab === "requests" ? colors.primary : colors.textSecondary }]}>
                Demandes
              </Text>
              {pendingCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.tabBadgeText, { color: colors.textInverse }]}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : tab === "items" ? (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
              }
              renderItem={({ item }) => (
                <View style={{ marginBottom: spacing.md }} testID={`my-item-${item.id}`}>
                  <Glass borderRadius={radius.lg}>
                    <View style={styles.card}>
                      <Image source={{ uri: item.photos[0] }} style={styles.img} />
                      <View style={styles.body}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.location, { color: colors.textSecondary }]}>{item.location?.address}</Text>
                        <View style={styles.bottomRow}>
                          <Text style={[styles.price, { color: colors.primary }]}>{item.price_per_day}€/jour</Text>
                          <View style={styles.actions}>
                            <TouchableOpacity
                              onPress={() => router.push(`/listing/${item.id}`)}
                              style={[styles.actionBtn, { backgroundColor: colors.primaryTint }]}
                              testID={`view-item-${item.id}`}
                            >
                              <Ionicons name="eye" size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => onDelete(item.id)}
                              style={[styles.actionBtn, { backgroundColor: colors.errorBg }]}
                              testID={`delete-item-${item.id}`}
                            >
                              <Ionicons name="trash" size={18} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Glass>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="cube-outline" size={48} color={colors.primary} />
                  </Glass>
                  <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{"Vous n'avez encore rien publié"}</Text>
                  <TouchableOpacity
                    style={[styles.cta, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
                    onPress={() => router.push("/(tabs)/create")}
                    testID="empty-create-btn"
                  >
                    <Text style={[styles.ctaText, { color: colors.textInverse }]}>Publier ma première annonce</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          ) : (
            // ─── REQUESTS TAB ─────────────────────
            <ScrollView
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
              }
            >
              {bookings.length === 0 ? (
                <View style={styles.empty}>
                  <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="mail-outline" size={48} color={colors.primary} />
                  </Glass>
                  <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Aucune demande pour le moment</Text>
                  <Text style={{ color: colors.textSecondary, textAlign: "center", maxWidth: 280 }}>
                    Les demandes de réservation pour vos annonces apparaîtront ici.
                  </Text>
                </View>
              ) : (
                bookings.map((b) => {
                  const statusColor = ownerStatusColor(b.status, colors);
                  const statusLabel = ownerStatusLabel(b.status);
                  return (
                    <View key={b.id} style={{ marginBottom: spacing.md }} testID={`booking-${b.id}`}>
                      <Glass borderRadius={radius.lg} style={styles.bookingCard}>
                        <View style={styles.bookingHead}>
                          {b.listing?.photos?.[0] && (
                            <Image source={{ uri: b.listing.photos[0] }} style={styles.bookingThumb} />
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.bookingTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                              {b.listing?.title || "Annonce supprimée"}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <View style={[styles.renterAv, { backgroundColor: colors.primaryTint }]}>
                                <Text style={[styles.renterAvText, { color: colors.primary }]}>
                                  {(b.renter?.name || "?").charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <Text style={[styles.renterName, { color: colors.textSecondary }]} numberOfLines={1}>
                                {b.renter?.name || "Locataire"}
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                          </View>
                        </View>

                        <View style={[styles.bookingMeta, { borderTopColor: colors.border }]}>
                          <View style={styles.bookingMetaItem}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]}>
                              {formatDate(b.start_date)} → {formatDate(b.end_date)}
                            </Text>
                          </View>
                          <View style={styles.bookingMetaItem}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]}>{b.days} jour{b.days > 1 ? "s" : ""}</Text>
                          </View>
                          <View style={styles.bookingMetaItem}>
                            <Ionicons name="cash-outline" size={14} color={colors.success} />
                            <Text style={[styles.bookingMetaText, { color: colors.success, fontWeight: "700" }]}>
                              {b.total_price}€
                            </Text>
                          </View>
                        </View>

                        {b.status === "pending" && (
                          <View style={styles.bookingActions}>
                            <TouchableOpacity
                              onPress={() => updateBooking(b.id, "refused")}
                              style={[styles.btnRefuse, { backgroundColor: colors.errorBg, borderColor: colors.error }]}
                              testID={`refuse-${b.id}`}
                            >
                              <Ionicons name="close" size={16} color={colors.error} />
                              <Text style={[styles.btnText, { color: colors.error }]}>Refuser</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => updateBooking(b.id, "confirmed")}
                              style={[styles.btnAccept, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.35, radius: 8, offsetY: 3 })]}
                              testID={`accept-${b.id}`}
                            >
                              <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                              <Text style={[styles.btnText, { color: colors.textInverse }]}>Accepter</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={() => router.push(`/messages/${b.renter_id || b.user_id || b.renter?.id}?listingId=${b.listing_id}`)}
                          style={[styles.btnMessage, { borderColor: colors.border }]}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
                          <Text style={[styles.btnText, { color: colors.primary }]}>Contacter le locataire</Text>
                        </TouchableOpacity>
                      </Glass>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function ownerStatusLabel(status: string) {
  if (status === "pending") return "En attente";
  if (status === "confirmed") return "Acceptée";
  if (status === "paid") return "Payée";
  if (status === "active") return "En cours";
  if (status === "completed") return "Terminée";
  if (status === "returned") return "Retournée";
  if (status === "refused") return "Refusée";
  if (status === "cancelled") return "Annulée";
  if (status === "disputed") return "Litige";
  return status;
}

function ownerStatusColor(status: string, colors: any) {
  if (status === "pending") return colors.warning;
  if (status === "confirmed" || status === "active") return colors.primary;
  if (status === "paid" || status === "completed" || status === "returned") return colors.success;
  if (status === "refused" || status === "cancelled" || status === "disputed") return colors.error;
  return colors.textSecondary;
}

const styles = StyleSheet.create({
  heading: { fontSize: 30, fontWeight: "800", paddingHorizontal: spacing.lg, paddingTop: spacing.md, letterSpacing: -1 },
  tabRow: { flexDirection: "row", paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.md, borderBottomWidth: 0 },
  tab: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderBottomWidth: 2, borderBottomColor: "transparent", flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 14, fontWeight: "700" },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { fontSize: 11, fontWeight: "800" },
  list: { padding: spacing.lg, flexGrow: 1, paddingBottom: 140 },
  card: { flexDirection: "row", overflow: "hidden" },
  img: { width: 110, height: 120 },
  body: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
  location: { fontSize: 13, marginTop: 2 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 15, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 12, flex: 1, justifyContent: "center" },
  emptyText: { fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 12 },
  cta: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md, marginTop: 12 },
  ctaText: { fontWeight: "700" },
  // Bookings
  bookingCard: { padding: spacing.md, gap: spacing.sm },
  bookingHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bookingThumb: { width: 56, height: 56, borderRadius: 10 },
  bookingTitle: { fontSize: 14, fontWeight: "800" },
  renterAv: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  renterAvText: { fontSize: 10, fontWeight: "800" },
  renterName: { fontSize: 12, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },
  bookingMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1 },
  bookingMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  bookingMetaText: { fontSize: 12 },
  bookingActions: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  btnRefuse: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  btnAccept: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md },
  btnMessage: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: "700" },
});
