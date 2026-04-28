import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { Map } from "../../src/Map";

const CATEGORY_LABELS: Record<string, string> = {
  car: "Voitures", bike: "Vélos", tool: "Outils", tech: "Tech", camping: "Camping", other: "Autres",
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/api/listings/${id}`);
        setListing(data);
      } catch (e) { console.log(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!listing) return null;
  const isOwner = user?.id === listing.owner_id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="listing-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.imgWrap}>
          <Image source={{ uri: listing.photos[0] }} style={styles.image} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.18)" }]} />
          <SafeAreaView edges={["top"]} style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} testID="back-btn">
              <Glass borderRadius={22} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFavorite(!favorite)}>
              <Glass borderRadius={22} style={styles.iconBtn}>
                <Ionicons name={favorite ? "heart" : "heart-outline"} size={20} color={favorite ? colors.secondary : colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={[styles.cat, { backgroundColor: colors.primaryTint }]}>
            <Text style={[styles.catText, { color: colors.primary }]}>
              {CATEGORY_LABELS[listing.category] || listing.category}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]} testID="listing-title">{listing.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>4.9 · 28 avis</Text>
            </View>
            <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{listing.location?.address}</Text>
            </View>
          </View>

          {listing.owner && (
            <Glass borderRadius={radius.lg} style={styles.ownerBox}>
              <View style={[styles.ownerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.ownerInitial, { color: colors.textInverse }]}>
                  {listing.owner.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ownerName, { color: colors.textPrimary }]}>{listing.owner.name}</Text>
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Propriétaire vérifié</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </Glass>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{listing.description}</Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Localisation</Text>
          <View style={styles.mapBox}>
            <Map
              initialCenter={{ latitude: listing.location.lat, longitude: listing.location.lng }}
              items={[{
                id: listing.id,
                coordinate: { latitude: listing.location.lat, longitude: listing.location.lng },
                title: listing.title,
                description: listing.location.address,
              }]}
            />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomWrap}>
        <Glass borderRadius={0} style={styles.bottomBar}>
          <View style={styles.bottomInner}>
            <View>
              <Text style={[styles.bottomPrice, { color: colors.textPrimary }]}>{listing.price_per_day}€</Text>
              <Text style={[styles.bottomUnit, { color: colors.textSecondary }]}>par jour</Text>
            </View>
            {isOwner ? (
              <View style={[styles.bookBtn, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.bookText, { color: colors.textSecondary }]}>Votre annonce</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.bookBtn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 })]}
                onPress={() => {
                  if (!user) { router.push("/(auth)/login"); return; }
                  router.push(`/booking/${listing.id}`);
                }}
                testID="book-now-btn"
              >
                <Text style={[styles.bookText, { color: colors.textInverse }]}>Réserver</Text>
              </TouchableOpacity>
            )}
          </View>
        </Glass>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  imgWrap: { width: "100%", height: 360 },
  image: { width: "100%", height: "100%" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg },
  cat: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: "flex-start", marginBottom: spacing.sm },
  catText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 14 },
  dot: {},
  ownerBox: { flexDirection: "row", alignItems: "center", padding: spacing.md, marginTop: spacing.lg, gap: spacing.md },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  ownerInitial: { fontSize: 20, fontWeight: "800" },
  ownerName: { fontSize: 16, fontWeight: "700" },
  ownerLabel: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm, letterSpacing: -0.2 },
  description: { fontSize: 15, lineHeight: 22 },
  mapBox: { height: 220, borderRadius: 16, overflow: "hidden", marginTop: 4 },
  bottomWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bottomBar: { borderTopWidth: 1, borderTopColor: "rgba(124,58,237,0.18)" },
  bottomInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bottomPrice: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6 },
  bottomUnit: { fontSize: 13 },
  bookBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.md },
  bookText: { fontWeight: "800", fontSize: 16 },
});
