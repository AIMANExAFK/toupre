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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { Map } from "../../src/Map";

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
  const colors = useColors();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

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
      onPress={() => router.push(`/listing/${item.id}`)}
      testID={`listing-card-${item.id}`}
      activeOpacity={0.85}
      style={{ marginBottom: spacing.md }}
    >
      <Glass borderRadius={radius.lg} style={shadowStyle({ opacity: 0.1, radius: 14, offsetY: 6 })}>
        <Image source={{ uri: item.photos[0] }} style={styles.cardImg} />
        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <View style={[styles.catTag, { backgroundColor: colors.primaryTint }]}>
              <Text style={[styles.catTagText, { color: colors.primary }]}>
                {getCatLabel(categories, item.category)}
              </Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.cardLoc}>
              <Ionicons name="location" size={13} color={colors.textTertiary} />
              <Text style={[styles.cardLocText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.location?.address}
              </Text>
            </View>
          </View>
          <View style={styles.priceBox}>
            <Text style={[styles.price, { color: colors.textPrimary }]}>{item.price_per_day}€</Text>
            <Text style={[styles.priceUnit, { color: colors.textTertiary }]}>/jour</Text>
          </View>
        </View>
      </Glass>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="explore-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Bonjour 👋</Text>
              <Text style={[styles.brand, { color: colors.textPrimary }]} testID="explore-title">
                Explorer
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
              testID="toggle-view-btn"
            >
              <Glass borderRadius={22} style={styles.toggleBtn}>
                <Ionicons
                  name={viewMode === "list" ? "map" : "list"}
                  size={20}
                  color={colors.primary}
                />
              </Glass>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Glass borderRadius={radius.md} style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Voiture, vélo, outil…"
                placeholderTextColor={colors.textTertiary}
                value={q}
                onChangeText={setQ}
                testID="search-input"
              />
            </Glass>
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
                  onPress={() => setActiveCat(c.id)}
                  testID={`cat-${c.id}`}
                  style={{ marginRight: 8 }}
                >
                  {active ? (
                    <View
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                        shadowStyle({ color: colors.primary, opacity: 0.4, radius: 12, offsetY: 4 }),
                      ]}
                    >
                      <Ionicons name={c.icon as any} size={16} color={colors.textInverse} />
                      <Text style={[styles.catText, { color: colors.textInverse }]}>{c.label}</Text>
                    </View>
                  ) : (
                    <Glass borderRadius={radius.pill} style={styles.catChip}>
                      <Ionicons name={c.icon as any} size={16} color={colors.textPrimary} />
                      <Text style={[styles.catText, { color: colors.textPrimary }]}>{c.label}</Text>
                    </Glass>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : viewMode === "map" ? (
            <View style={styles.mapWrap}>
              <Map
                initialCenter={{ latitude: 48.8566, longitude: 2.3522 }}
                items={listings.map((l) => ({
                  id: l.id,
                  coordinate: { latitude: l.location.lat, longitude: l.location.lng },
                  title: l.title,
                  description: `${l.price_per_day}€/jour`,
                  onPress: () => router.push(`/listing/${l.id}`),
                }))}
              />
            </View>
          ) : (
            <FlatList
              data={listings}
              keyExtractor={(i) => i.id}
              renderItem={renderCard}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun résultat</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function getCatLabel(cats: Category[], id: string) {
  const c = cats.find((x) => x.id === id);
  return c?.label || id;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  greeting: { fontSize: 13, fontWeight: "600" },
  brand: { fontSize: 30, fontWeight: "800", letterSpacing: -1, marginTop: 2 },
  toggleBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  catScroll: { maxHeight: 60, marginTop: spacing.md },
  catContainer: { paddingHorizontal: spacing.lg },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  catText: { fontSize: 13, fontWeight: "700" },
  list: { padding: spacing.lg, paddingBottom: 140 },
  cardImg: { width: "100%", height: 180 },
  cardBody: { flexDirection: "row", padding: spacing.md, alignItems: "flex-start" },
  catTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start", marginBottom: 6 },
  catTagText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4, letterSpacing: -0.2 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardLocText: { fontSize: 13, flex: 1 },
  priceBox: { alignItems: "flex-end" },
  price: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  priceUnit: { fontSize: 12 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapWrap: { flex: 1, padding: spacing.lg, paddingBottom: 100 },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 12 },
  emptyText: { fontSize: 15 },
});
