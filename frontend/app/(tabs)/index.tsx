import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../src/auth";
import { colors, spacing, radius, shadows } from "../../src/theme";

type Listing = {
  id: string;
  title: string;
  category: string;
  price_per_day: number;
  photos: string[];
  location: { lat: number; lng: number; address: string };
  owner?: { id: string; name: string; avatar?: string | null };
};

type Category = { id: string; label: string; icon: string };

export default function Explore() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [MapView, setMapView] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        const m = require("react-native-maps");
        setMapView(() => m.default);
        setMarker(() => m.Marker);
      } catch (e) {
        // maps not available
      }
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [items, cats] = await Promise.all([
        apiFetch(`/api/listings${activeCat !== "all" ? `?category=${activeCat}` : ""}`),
        apiFetch("/api/categories"),
      ]);
      const filtered = q
        ? items.filter((i: Listing) => i.title.toLowerCase().includes(q.toLowerCase()))
        : items;
      setListings(filtered);
      setCategories(cats);
    } catch (e) {
      console.log("load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCat, q]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderCard = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${item.id}`)}
      testID={`listing-card-${item.id}`}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.photos[0] }} style={styles.cardImg} />
      <View style={styles.cardBody}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardCat}>{getCatLabel(categories, item.category)}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.cardLoc}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.cardLocText} numberOfLines={1}>
              {item.location?.address}
            </Text>
          </View>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{item.price_per_day}€</Text>
          <Text style={styles.priceUnit}>/jour</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} testID="explore-screen" edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.brand} testID="explore-title">
          LocaShare
        </Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          testID="toggle-view-btn"
        >
          <Ionicons
            name={viewMode === "list" ? "map-outline" : "list-outline"}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une voiture, un vélo, un outil..."
          placeholderTextColor={colors.textTertiary}
          value={q}
          onChangeText={setQ}
          testID="search-input"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContainer}
      >
        {categories.map((c) => {
          const active = c.id === activeCat;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setActiveCat(c.id)}
              testID={`cat-${c.id}`}
            >
              <Ionicons
                name={c.icon as any}
                size={16}
                color={active ? colors.surface : colors.textPrimary}
              />
              <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : viewMode === "map" && MapView ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: 48.8566,
            longitude: 2.3522,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {listings.map((l) => (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.location.lat, longitude: l.location.lng }}
              title={l.title}
              description={`${l.price_per_day}€/jour`}
              onCalloutPress={() => router.push(`/listing/${l.id}`)}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(i) => i.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Aucun résultat</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function getCatLabel(cats: Category[], id: string) {
  const c = cats.find((x) => x.id === id);
  return c?.label || id;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  toggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  catScroll: { maxHeight: 56, marginTop: spacing.md },
  catContainer: { paddingHorizontal: spacing.lg, gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  catTextActive: { color: colors.surface },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardImg: { width: "100%", height: 180, backgroundColor: colors.surface2 },
  cardBody: {
    flexDirection: "row",
    padding: spacing.md,
    alignItems: "flex-start",
  },
  cardCat: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardLocText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  priceBox: { alignItems: "flex-end" },
  price: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  priceUnit: { fontSize: 12, color: colors.textTertiary },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
