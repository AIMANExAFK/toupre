import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { colors, spacing, radius, shadows } from "../../src/theme";

export default function Bookings() {
  const { token } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => item.listing && router.push(`/listing/${item.listing.id}`)}
      testID={`booking-${item.id}`}
    >
      {item.listing?.photos?.[0] && (
        <Image source={{ uri: item.listing.photos[0] }} style={styles.img} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.listing?.title || "Annonce supprimée"}
        </Text>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.dates}>
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={[styles.statusPill, statusStyle(item.status)]}>
            <Text style={[styles.statusText, statusTextStyle(item.status)]}>
              {statusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.total}>{item.total_price}€</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} testID="bookings-screen" edges={["top"]}>
      <Text style={styles.heading}>Mes locations</Text>

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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Aucune location pour le moment</Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push("/(tabs)")}
                testID="empty-explore-btn"
              >
                <Text style={styles.exploreBtnText}>Explorer les annonces</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
  if (s === "pending") return "En attente";
  if (s === "cancelled") return "Annulée";
  return s;
}

function statusStyle(s: string) {
  if (s === "paid") return { backgroundColor: colors.successBg };
  if (s === "cancelled") return { backgroundColor: colors.errorBg };
  return { backgroundColor: colors.surface2 };
}

function statusTextStyle(s: string) {
  if (s === "paid") return { color: colors.success };
  if (s === "cancelled") return { color: colors.error };
  return { color: colors.textSecondary };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    letterSpacing: -0.5,
  },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  img: { width: 100, height: 100, backgroundColor: colors.surface2 },
  body: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  dates: { fontSize: 13, color: colors.textSecondary },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: "600" },
  total: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 15, marginTop: 8 },
  exploreBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 12,
  },
  exploreBtnText: { color: colors.surface, fontWeight: "600" },
});
