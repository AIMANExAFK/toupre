import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { colors, spacing, radius, shadows } from "../../src/theme";

const CATEGORY_LABELS: Record<string, string> = {
  car: "Voitures",
  bike: "Vélos",
  tool: "Outils",
  tech: "Tech",
  camping: "Camping",
  other: "Autres",
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [MapView, setMapView] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        const m = require("react-native-maps");
        setMapView(() => m.default);
        setMarker(() => m.Marker);
      } catch {}
    }
    (async () => {
      try {
        const data = await apiFetch(`/api/listings/${id}`);
        setListing(data);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!listing) return null;

  const isOwner = user?.id === listing.owner_id;

  return (
    <View style={styles.container} testID="listing-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.imgWrap}>
          <Image source={{ uri: listing.photos[0] }} style={styles.image} />
          <SafeAreaView edges={["top"]} style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="heart-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={styles.cat}>{CATEGORY_LABELS[listing.category] || listing.category}</Text>
          <Text style={styles.title} testID="listing-title">
            {listing.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={styles.metaText}>4.9</Text>
            </View>
            <Text style={styles.dot}>·</Text>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{listing.location?.address}</Text>
            </View>
          </View>

          {listing.owner && (
            <View style={styles.ownerBox}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerInitial}>{listing.owner.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{listing.owner.name}</Text>
                <Text style={styles.ownerLabel}>Propriétaire</Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <Text style={styles.sectionTitle}>Localisation</Text>
          {MapView ? (
            <View style={styles.mapBox}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: listing.location.lat,
                  longitude: listing.location.lng,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                pointerEvents="none"
              >
                <Marker
                  coordinate={{
                    latitude: listing.location.lat,
                    longitude: listing.location.lng,
                  }}
                />
              </MapView>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={32} color={colors.primary} />
              <Text style={styles.mapText}>{listing.location?.address}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomPrice}>{listing.price_per_day}€</Text>
            <Text style={styles.bottomUnit}>par jour</Text>
          </View>
          {isOwner ? (
            <View style={[styles.bookBtn, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.bookText, { color: colors.textSecondary }]}>Votre annonce</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => {
                if (!user) {
                  router.push("/(auth)/login");
                  return;
                }
                router.push(`/booking/${listing.id}`);
              }}
              testID="book-now-btn"
            >
              <Text style={styles.bookText}>Réserver</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  imgWrap: { width: "100%", height: 320, backgroundColor: colors.surface2 },
  image: { width: "100%", height: "100%" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  body: { padding: spacing.lg },
  cat: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 6,
    letterSpacing: -0.4,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 14, color: colors.textSecondary },
  dot: { color: colors.textTertiary },
  ownerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerInitial: { color: colors.surface, fontSize: 20, fontWeight: "700" },
  ownerName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  ownerLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  mapBox: { height: 180, borderRadius: radius.md, overflow: "hidden" },
  mapPlaceholder: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapText: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bottomPrice: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  bottomUnit: { fontSize: 13, color: colors.textSecondary },
  bookBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadows.primary,
  },
  bookText: { color: colors.surface, fontWeight: "700", fontSize: 16 },
});
