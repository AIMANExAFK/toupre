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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass } from "../../src/Glass";
import { EnTeteSombre, BoutonEnTete } from "../../src/EnTeteSombre";
import { compte } from "../../src/francais";
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
  const [panne, setPanne] = useState(false);
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
      setPanne(false);
    } catch (e) {
      // Distinguer « rien ne correspond » de « je n'ai pas pu demander » :
      // le remède n'est pas le même, et l'un des deux n'est pas de son fait.
      setPanne(true);
      setListings([]);
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
      <View style={{ flex: 1 }}>
          <EnTeteSombre
            titre={user?.name ? `Bonjour ${user.name.split(" ")[0]}` : "Bonjour"}
            tailleTitre={23}
            droite={
              <BoutonEnTete
                icone={viewMode === "list" ? "map-outline" : "list-outline"}
                libelle={viewMode === "list" ? "Afficher la carte" : "Afficher la liste"}
                onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
                testID="toggle-view-btn"
              />
            }
          >
            {/* Comme le solde du tableau de bord Slate : un petit libellé gris,
                puis le chiffre en grand. */}
            <View>
              <Text style={[styles.libelle, { color: colors.onInkMuted }]} testID="explore-title">
                Louer près de vous
              </Text>
              <Text style={[styles.chiffre, { color: colors.onInk }]} testID="explore-compte">
                {loading ? "…" : compte(listings.length, "annonce")}
              </Text>
            </View>

            <View style={styles.searchWrap}>
              <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
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
              </View>
              <BoutonEnTete
                icone="options-outline"
                libelle={filtresOuverts ? "Masquer les filtres" : "Afficher les filtres"}
                onPress={() => setFiltresOuverts((v) => !v)}
                testID="filtres-btn"
                actif={filtresActifs}
                etendu={filtresOuverts}
              />
            </View>
          </EnTeteSombre>

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
                <View style={styles.empty} testID={panne ? "explore-panne" : "explore-vide"}>
                  <View style={[styles.emptyIcon, { backgroundColor: panne ? colors.errorBg : colors.primaryTint }]}>
                    <Ionicons
                      name={panne ? "cloud-offline-outline" : "search-outline"}
                      size={32}
                      color={panne ? colors.error : colors.primary}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {panne ? "Annonces indisponibles" : "Aucun résultat"}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    {panne
                      ? "Impossible de joindre le serveur.\nVérifiez votre connexion."
                      : "Essayez une autre catégorie\nou modifiez votre recherche."}
                  </Text>
                  {panne && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => { setLoading(true); load(); }}
                      testID="explore-reessayer"
                      style={[styles.reessai, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="refresh" size={16} color={colors.textInverse} />
                      <Text style={[styles.reessaiTxt, { color: colors.textInverse }]}>Réessayer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
      </View>
    </View>
  );
}

function getCatLabel(cats: Category[], id: string) {
  const c = cats.find((x) => x.id === id);
  return c?.label || id;
}

const styles = StyleSheet.create({
  libelle: { fontSize: 12.5, fontWeight: "500" },
  chiffre: { fontSize: 34, fontWeight: "600", letterSpacing: -1, marginTop: 2 },

  reessai: {
    flexDirection: "row", alignItems: "center", gap: 7, marginTop: 16,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md,
  },
  reessaiTxt: { fontSize: 14, fontWeight: "600" },
  // KYC banner
  kycBanner: { paddingHorizontal: spacing.md, marginTop: 14, marginBottom: 2 },
  kycBannerInner: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderWidth: 1 },
  kycIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kycTitle: { fontSize: 13, fontWeight: "700", letterSpacing: -0.2 },
  kycSub: { fontSize: 11, lineHeight: 14, marginTop: 2 },
  kycCta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  kycCtaText: { fontSize: 11, fontWeight: "600" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
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
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filtres: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 6 },
  filtreLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  puces: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1.5 },
  puceTxt: { fontSize: 12.5, fontWeight: "700" },

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



  mapWrap: { flex: 1, padding: spacing.md, paddingBottom: 130 },

  empty: { alignItems: "center", padding: spacing.xxl, gap: 10, paddingTop: 64 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, color: "gray" },
});
