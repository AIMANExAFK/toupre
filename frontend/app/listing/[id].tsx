import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass } from "../../src/Glass";
import { SkeletonBox } from "../../src/Skeleton";
import { Map } from "../../src/Map";
import { ReportModal } from "../../src/ReportModal";
import { Photo } from "../../src/Photo";
import { Galerie } from "../../src/Galerie";

const CATEGORY_LABELS: Record<string, string> = {
  car: "Voitures", bike: "Vélos", tool: "Outils", tech: "Tech", camping: "Camping", other: "Autres",
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [listing, setListing] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ rating: number | null; count: number }>({ rating: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const bookScale = useRef(new Animated.Value(1)).current;
  const favScale = useRef(new Animated.Value(1)).current;

  const pressIn = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
  const pressOut = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/api/listings/${id}`);
        setListing(data);
        try {
          const r = await apiFetch(`/api/reviews/listing/${id}`);
          setReviews(r.reviews || []);
          setReviewStats({ rating: r.rating, count: r.count || 0 });
        } catch {}
      } catch (e) { console.log(e); setError(true); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const contactOwner = () => {
    if (!user) { router.push("/auth/otp"); return; }
    if (!listing?.owner?.id) return;
    router.push(`/messages/${listing.owner.id}?listingId=${listing.id}`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }} testID="listing-detail-screen">
        <SkeletonBox width="100%" height={360} borderRadius={0} />
        <View style={{ padding: spacing.lg, gap: 14 }}>
          <SkeletonBox width="25%" height={28} borderRadius={radius.pill} />
          <SkeletonBox width="85%" height={32} borderRadius={radius.sm} />
          <SkeletonBox width="60%" height={18} borderRadius={radius.sm} />
          <SkeletonBox width="100%" height={72} borderRadius={radius.lg} style={{ marginTop: spacing.sm }} />
          <SkeletonBox width="40%" height={22} borderRadius={radius.sm} style={{ marginTop: spacing.md }} />
          <SkeletonBox width="100%" height={16} borderRadius={radius.sm} />
          <SkeletonBox width="90%" height={16} borderRadius={radius.sm} />
          <SkeletonBox width="75%" height={16} borderRadius={radius.sm} />
        </View>
      </View>
    );
  }
  if (error || !listing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Ionicons name="alert-circle-outline" size={52} color={colors.error} />
        <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "700" }}>Annonce introuvable</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const isOwner = user?.id === listing.owner_id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="listing-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.imgWrap}>
          <Galerie photos={listing.photos || []} titre={listing.title} hauteur={360} largeur={420} />
          {/* Voile léger pour que les boutons blancs du haut restent lisibles
              quelle que soit la photo. Il ne doit pas intercepter le balayage
              de la galerie. */}
          <View pointerEvents="none" style={[styles.voile, { backgroundColor: "rgba(0,0,0,0.18)" }]} />
          <SafeAreaView edges={["top"]} style={styles.topBar}>
            <TouchableOpacity accessibilityLabel="Retour" accessibilityRole="button" onPress={() => router.back()} testID="back-btn">
              <Glass borderRadius={22} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Animated.View style={{ transform: [{ scale: favScale }] }}>
                <TouchableOpacity accessibilityRole="button"
                  accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  onPress={() => setFavorite(!favorite)}
                  onPressIn={() => pressIn(favScale)}
                  onPressOut={() => pressOut(favScale)}
                  activeOpacity={1}
                >
                  <Glass borderRadius={8} style={styles.iconBtn}>
                    <Ionicons name={favorite ? "heart" : "heart-outline"} size={20} color={favorite ? colors.secondary : colors.textPrimary} />
                  </Glass>
                </TouchableOpacity>
              </Animated.View>
              {!isOwner && (
                <TouchableOpacity accessibilityLabel="Signaler" accessibilityRole="button" onPress={() => setReportOpen(true)} testID="report-listing-btn">
                  <Glass borderRadius={22} style={styles.iconBtn}>
                    <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
                  </Glass>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={[styles.cat, { backgroundColor: colors.primaryTint }]}>
            <Text style={[styles.catText, { color: colors.primary }]}>
              {CATEGORY_LABELS[listing.category] || listing.category}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]} testID="listing-title">{listing.title}</Text>

          <Glass borderRadius={radius.lg} style={styles.pricePanel}>
            <View>
              <Text style={[styles.pricePanelLabel, { color: colors.textSecondary }]}>Prix de location</Text>
              <Text style={[styles.pricePanelValue, { color: colors.textPrimary }]}>
                {listing.price_per_day}€ <Text style={{ color: colors.textSecondary, fontSize: 15 }}>par jour</Text>
              </Text>
            </View>
            <View style={[styles.feePill, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.feeText, { color: colors.success }]}>0€ frais app</Text>
            </View>
          </Glass>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {reviewStats.rating ? `${reviewStats.rating.toFixed(1)} · ${reviewStats.count} avis` : "Pas encore d'avis"}
              </Text>
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
              {!isOwner && (
                <TouchableOpacity accessibilityRole="button"
                  onPress={contactOwner}
                  style={[styles.contactBtn, { backgroundColor: colors.primaryTint }]}
                  testID="contact-owner-btn"
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                  <Text style={[styles.contactBtnText, { color: colors.primary }]}>Contacter</Text>
                </TouchableOpacity>
              )}
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

          {/* ─── AVIS ───────────────────────────────── */}
          <View style={styles.reviewsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 0 }]}>
              Avis {reviewStats.count > 0 ? `(${reviewStats.count})` : ""}
            </Text>
            {reviewStats.rating !== null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={[styles.metaText, { color: colors.textPrimary, fontWeight: "600" }]}>
                  {reviewStats.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          {reviews.length === 0 ? (
            <View style={[styles.emptyReviews, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textTertiary} />
              <Text style={[styles.emptyReviewsText, { color: colors.textSecondary }]}>
                Aucun avis pour le moment. Soyez le premier !
              </Text>
            </View>
          ) : (
            reviews.map((r) => (
              <Glass key={r.id} borderRadius={radius.lg} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <View style={[styles.reviewAvatar, { backgroundColor: colors.surface2 }]}>
                    <Text style={[styles.reviewInitial, { color: colors.textPrimary }]}>
                      {(r.author?.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewName, { color: colors.textPrimary }]}>{r.author?.name || "Anonyme"}</Text>
                    <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= r.rating ? "star" : "star-outline"}
                        size={13}
                        color={s <= r.rating ? colors.warning : colors.textTertiary}
                      />
                    ))}
                  </View>
                </View>
                {r.comment ? (
                  <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{r.comment}</Text>
                ) : null}
              </Glass>
            ))
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomWrap}>
        <Glass borderRadius={0} style={[styles.bottomBar, { borderTopColor: colors.border }]}>
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
              <Animated.View style={{ transform: [{ scale: bookScale }] }}>
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.bookBtn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 })]}
                  onPress={() => {
                    if (!user) { router.push("/auth/otp"); return; }
                    // Vérification email+téléphone avant réservation
                    if (user && !user.verified) {
                      router.push("/auth/otp?reason=booking");
                      return;
                    }
                    router.push(`/booking/${listing.id}`);
                  }}
                  onPressIn={() => pressIn(bookScale)}
                  onPressOut={() => pressOut(bookScale)}
                  activeOpacity={1}
                  testID="book-now-btn"
                >
                  <Text style={[styles.bookText, { color: colors.textInverse }]}>Réserver</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Glass>
      </SafeAreaView>

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="listing"
        targetId={listing.id}
        targetLabel={listing.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  imgWrap: { width: "100%", height: 360 },
  // Le voile s'arrête au-dessus des pastilles de la galerie
  voile: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  image: { width: "100%", height: "100%" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg },
  cat: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: "flex-start", marginBottom: spacing.sm },
  catText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: 0, lineHeight: 34 },
  pricePanel: { marginTop: spacing.md, padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1 },
  pricePanelLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  pricePanelValue: { fontSize: 24, fontWeight: "700", marginTop: 2 },
  feePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  feeText: { fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 14 },
  dot: {},
  ownerBox: { flexDirection: "row", alignItems: "center", padding: spacing.md, marginTop: spacing.lg, gap: spacing.md, borderWidth: 1 },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  ownerInitial: { fontSize: 20, fontWeight: "600" },
  ownerName: { fontSize: 16, fontWeight: "700" },
  ownerLabel: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm, letterSpacing: 0 },
  description: { fontSize: 15, lineHeight: 22 },
  mapBox: { height: 220, borderRadius: 8, overflow: "hidden", marginTop: 4 },
  bottomWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bottomBar: { borderTopWidth: 1 },
  bottomInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bottomPrice: { fontSize: 24, fontWeight: "600", letterSpacing: -0.6 },
  bottomUnit: { fontSize: 13 },
  bookBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999},
  bookText: { fontWeight: "600", fontSize: 16 },
  contactBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  contactBtnText: { fontSize: 13, fontWeight: "700" },
  reviewsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyReviews: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyReviewsText: { fontSize: 13, textAlign: "center" },
  reviewCard: { padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reviewInitial: { fontSize: 14, fontWeight: "600" },
  reviewName: { fontSize: 14, fontWeight: "700" },
  reviewDate: { fontSize: 11, marginTop: 2 },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewText: { fontSize: 14, lineHeight: 20 },
});
