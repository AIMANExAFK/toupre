import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { SkeletonCard } from "../../src/Skeleton";
import { Map } from "../../src/Map";
import { RentalCard } from "../../src/RentalCard";

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
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [prixMax, setPrixMax] = useState<number | null>(null);
  const [tri, setTri] = useState<"recent" | "prix_croissant" | "prix_decroissant">("recent");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // La requête part après une pause de frappe : on ne relance pas le serveur à
  // chaque caractère (FR-004).
  useEffect(() => {
    const t = setTimeout(() => setRecherche(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const filtresActifs = prixMax !== null || tri !== "recent";

  const categoryOptions: Category[] = [
    { id: "all", label: "Tout", icon: "apps" },
    ...categories.filter((category) => category.id !== "all"),
  ];
  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeCat !== "all") params.set("category", activeCat);
    if (recherche) params.set("q", recherche);
    if (prixMax !== null) params.set("max_price", String(prixMax));
    if (tri !== "recent") params.set("sort", tri);
    try {
      const [items, cats] = await Promise.all([
        apiFetch(`/api/listings${params.toString() ? `?${params}` : ""}`),
        apiFetch("/api/categories"),
      ]);
      setListings(items);
      setCategories(cats);
    } catch (e) {
      console.log("load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCat, recherche, prixMax, tri]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderCard = ({ item }: { item: Listing }) => {
    const isOwn = !!user && item.owner?.id === user.id;
    return (
      <View style={{ marginBottom: spacing.md }}>
        <RentalCard
          id={item.id}
          image={item.photos[0]}
          category={item.category}
          categoryLabel={getCatLabel(categories, item.category)}
          title={item.title}
          pricePerDay={item.price_per_day}
          rating={(item as any).rating ?? null}
          reviewCount={(item as any).count ?? 0}
          location={item.location?.address || ""}
          ownerName={item.owner?.name || "Propriétaire"}
          ownerInitial={item.owner?.name?.charAt(0).toUpperCase()}
          ownerAvatar={item.owner?.avatar || null}
          isVerified={(item.owner as any)?.verified ?? true}
          isOwnListing={isOwn}
          onPress={() => router.push(`/listing/${item.id}`)}
          onBook={() => {
            if (!user) { router.push("/auth/otp"); return; }
            if (!user.verified) { router.push("/auth/otp?reason=booking"); return; }
            router.push(`/booking/${item.id}`);
          }}
          onContact={() => {
            if (!user) { router.push("/auth/otp"); return; }
            if (item.owner?.id) router.push(`/messages/${item.owner.id}?listingId=${item.id}`);
          }}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="explore-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <View>
              <Text dataSet={{ brandFont: "1" }} style={[styles.greeting, { color: colors.primary }]}>toupré</Text>
              <Text style={[styles.brand, { color: colors.textPrimary }]} testID="explore-title">
                Louer près de vous
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={viewMode === "list" ? "Afficher la carte" : "Afficher la liste"}
              onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
              testID="toggle-view-btn"
              activeOpacity={0.8}
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

          {/* Contact verification banner */}
          {user && !user.verified && (
            <TouchableOpacity accessibilityRole="button"
              onPress={() => router.push("/auth/otp")}
              activeOpacity={0.85}
              style={styles.kycBanner}
              testID="kyc-banner"
            >
              <Glass borderRadius={radius.lg} style={[styles.kycBannerInner, { borderColor: colors.warning || "#F59E0B" }]}>
                <View style={[styles.kycIcon, { backgroundColor: (colors.warningBg || "rgba(245,158,11,0.18)") }]}>
                  <Ionicons name="shield-outline" size={22} color={colors.warning || "#F59E0B"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.kycTitle, { color: colors.textPrimary }]}>Email et téléphone non vérifiés</Text>
                  <Text style={[styles.kycSub, { color: colors.textSecondary }]}>
                    Recevez un code pour publier, réserver ou contacter un propriétaire.
                  </Text>
                </View>
                <View style={[styles.kycCta, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.kycCtaText, { color: colors.textInverse }]}>Vérifier</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textInverse} />
                </View>
              </Glass>
            </TouchableOpacity>
          )}

          <View style={styles.heroCard}>
            <Glass borderRadius={radius.lg} style={styles.heroSurface}>
              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.textInverse} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                    {"Trouvez un objet fiable, sans l'acheter."}
                  </Text>
                  <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                    Réservation simple, contact vérifié, retrait local.
                  </Text>
                </View>
              </View>
              <View style={styles.metricRow}>
                <Metric value={String(listings.length || "8+")} label="annonces" colors={colors} />
                <Metric value="0€" label="frais app" colors={colors} />
                <Metric value="cash" label="à la remise" colors={colors} />
              </View>
            </Glass>
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
                returnKeyType="search"
              />
              {q.length > 0 && (
                <TouchableOpacity accessibilityLabel="Effacer la recherche" accessibilityRole="button" onPress={() => setQ("")} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </Glass>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={filtresOuverts ? "Masquer les filtres" : "Afficher les filtres"}
              accessibilityState={{ expanded: filtresOuverts }}
              activeOpacity={0.8}
              onPress={() => setFiltresOuverts((v) => !v)}
              testID="filtres-btn"
            >
              <Glass borderRadius={radius.md} style={styles.filterBtn}>
                <Ionicons name="options-outline" size={20} color={filtresActifs ? colors.primary : colors.textSecondary} />
                {filtresActifs && <View style={[styles.pastille, { backgroundColor: colors.primary }]} />}
              </Glass>
            </TouchableOpacity>
          </View>

          {filtresOuverts && (
            <View style={styles.filtres} testID="filtres-panneau">
              <Text style={[styles.filtreLabel, { color: colors.textSecondary }]}>Prix maximum par jour</Text>
              <View style={styles.puces}>
                {[null, 15, 30, 60].map((v) => {
                  const actif = prixMax === v;
                  return (
                    <TouchableOpacity
                      key={String(v)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: actif }}
                      onPress={() => setPrixMax(v)}
                      testID={`prix-${v ?? "tous"}`}
                      style={[styles.puce, { borderColor: actif ? colors.primary : colors.border,
                                             backgroundColor: actif ? colors.primaryTint : "transparent" }]}
                    >
                      <Text style={[styles.puceTxt, { color: actif ? colors.primary : colors.textSecondary }]}>
                        {v === null ? "Tous" : `≤ ${v}€`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filtreLabel, { color: colors.textSecondary }]}>Trier par</Text>
              <View style={styles.puces}>
                {([
                  ["recent", "Plus récentes"],
                  ["prix_croissant", "Prix croissant"],
                  ["prix_decroissant", "Prix décroissant"],
                ] as const).map(([v, libelle]) => {
                  const actif = tri === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      accessibilityRole="button"
                      accessibilityState={{ selected: actif }}
                      onPress={() => setTri(v)}
                      testID={`tri-${v}`}
                      style={[styles.puce, { borderColor: actif ? colors.primary : colors.border,
                                             backgroundColor: actif ? colors.primaryTint : "transparent" }]}
                    >
                      <Text style={[styles.puceTxt, { color: actif ? colors.primary : colors.textSecondary }]}>{libelle}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catContainer}
          >
            {categoryOptions.map((c) => {
              const active = c.id === activeCat;
              return (
                <TouchableOpacity accessibilityRole="button"
                  key={c.id}
                  onPress={() => setActiveCat(c.id)}
                  testID={`cat-${c.id}`}
                  style={{ marginRight: 8 }}
                  activeOpacity={0.8}
                >
                  {active ? (
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                        shadowStyle({ color: colors.primary, opacity: 0.22, radius: 12, offsetY: 4 }),
                      ]}
                    >
                      <Ionicons name={c.icon as any} size={15} color={colors.textInverse} />
                      <Text style={[styles.chipText, { color: colors.textInverse }]}>{c.label}</Text>
                    </View>
                  ) : (
                    <Glass borderRadius={radius.pill} style={styles.chip}>
                      <Ionicons name={c.icon as any} size={15} color={colors.textSecondary} />
                      <Text style={[styles.chipText, { color: colors.textSecondary }]}>{c.label}</Text>
                    </Glass>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <FlatList
              data={[1, 2, 3]}
              keyExtractor={(i) => String(i)}
              renderItem={() => <SkeletonCard />}
              contentContainerStyle={styles.list}
              scrollEnabled={false}
            />
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
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="search-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Aucun résultat
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Essaie une autre catégorie{"\n"}ou modifie ta recherche
                  </Text>
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

function Metric({ value, label, colors }: { value: string; label: string; colors: any }) {
  return (
    <View style={[styles.metric, { borderColor: colors.surfaceGlassBorder, backgroundColor: colors.surfaceGlass }]}>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 8,
  },
  greeting: { fontSize: 11, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  brand: { fontSize: 24, fontWeight: "900", letterSpacing: 0, marginTop: 2 },
  toggleBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },

  heroCard: { paddingHorizontal: spacing.md, marginTop: 6 },
  heroSurface: { padding: 14, borderWidth: 1 },
  // KYC banner
  kycBanner: { paddingHorizontal: spacing.md, marginTop: 6, marginBottom: 4 },
  kycBannerInner: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderWidth: 1 },
  kycIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kycTitle: { fontSize: 13, fontWeight: "900", letterSpacing: -0.2 },
  kycSub: { fontSize: 11, lineHeight: 14, marginTop: 2 },
  kycCta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  kycCtaText: { fontSize: 11, fontWeight: "800" },
  heroTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  heroIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 16, fontWeight: "900", letterSpacing: 0, lineHeight: 20 },
  heroSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  metricRow: { flexDirection: "row", gap: 7, marginTop: 12 },
  metric: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 6 },
  metricValue: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  metricLabel: { fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 2 },

  searchWrap: {
    paddingHorizontal: spacing.md,
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  pastille: { position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: 4 },
  filtres: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 6 },
  filtreLabel: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  puces: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1.5 },
  puceTxt: { fontSize: 12.5, fontWeight: "700" },
  filterBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },

  catScroll: {
    height: 50,
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 10,
    overflow: "visible",
    zIndex: 2,
  },
  catContainer: {
    height: 50,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  list: { padding: spacing.md, paddingBottom: 120 },

  card: { borderRadius: radius.lg, overflow: "hidden", borderWidth: 1 },
  imgWrap: { position: "relative" },
  cardImg: { width: "100%", height: 156 },
  imgGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  catChipImg: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  catChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  priceBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceValue: { fontSize: 19, fontWeight: "800", color: "#fff", letterSpacing: 0 },
  priceUnit: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "600" },

  cardBody: { padding: 12, gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: "900", letterSpacing: 0 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, marginRight: 8 },
  cardLocText: { fontSize: 13, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontWeight: "600" },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2 },
  ownerBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  ownerInitial: { fontSize: 11, fontWeight: "700" },
  ownerName: { fontSize: 12, fontWeight: "500" },

  mapWrap: { flex: 1, padding: spacing.md, paddingBottom: 130 },

  empty: { alignItems: "center", padding: spacing.xxl, gap: 10, paddingTop: 64 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, color: "gray" },
});
