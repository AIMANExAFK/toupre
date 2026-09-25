import { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, radius, shadowStyle } from "./theme";
import { Photo } from "./Photo";

// La carte occupe la largeur de l'écran moins les marges : on demande au CDN
// une image calibrée pour ça, pas l'original de 6 mégapixels.
const LARGEUR_CARTE = 380;

export type RentalCardProps = {
  id: string;
  image: string;
  category: string;
  categoryLabel?: string;
  title: string;
  pricePerDay: number;
  rating?: number | null;
  reviewCount?: number;
  location: string;
  ownerName: string;
  ownerInitial?: string;
  ownerAvatar?: string | null;
  isVerified?: boolean;
  onPress?: () => void;
  onBook?: () => void;
  onContact?: () => void;
  isOwnListing?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  car: "Voitures", bike: "Vélos", tool: "Outils",
  tech: "Tech", camping: "Camping", other: "Autres",
};

export function RentalCard({
  image, category, categoryLabel, title, pricePerDay,
  rating = null, reviewCount = 0, location,
  ownerName, ownerInitial, ownerAvatar,
  isVerified = false, onPress, onBook, onContact, isOwnListing = false,
}: RentalCardProps) {
  const colors = useColors();
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const imgScale = useRef(new Animated.Value(1)).current;

  const onHoverIn = () => {
    setHovered(true);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.02, useNativeDriver: true, speed: 30 }),
      Animated.spring(imgScale, { toValue: 1.08, useNativeDriver: true, speed: 20 }),
    ]).start();
  };
  const onHoverOut = () => {
    setHovered(false);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
      Animated.spring(imgScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const catLabel = categoryLabel || CATEGORY_LABELS[category] || category;
  const initial = ownerInitial || ownerName?.charAt(0).toUpperCase() || "?";

  // Badge de catégorie monochrome, comme toute l'interface Slate : pastille
  // blanche translucide sur la photo, texte noir. (Avant : vert, rouge ou
  // sarcelle selon la catégorie.)
  const catBg = "rgba(255, 255, 255, 0.88)";
  const catFg = "#0A0A0A";
  const catBorder = "transparent";

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, styles.wrap]}
      // @ts-ignore web events
      onMouseEnter={Platform.OS === "web" ? onHoverIn : undefined}
      onMouseLeave={Platform.OS === "web" ? onHoverOut : undefined}
    >
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${title} — ${pricePerDay}€ par jour, ${location}`} activeOpacity={0.95} onPress={onPress} testID={`rental-card-${title}`}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            shadowStyle({ color: colors.primaryDark, opacity: hovered ? 0.22 : 0.10, radius: hovered ? 26 : 16, offsetY: hovered ? 14 : 8 }),
          ]}
        >
          {/* Hero Image */}
          <View style={styles.imgWrap}>
            <Photo
              uri={image}
              largeur={LARGEUR_CARTE}
              style={styles.img}
              transform={[{ scale: imgScale }]}
              alt={`Photo de ${title}`}
              icone="cube-outline"
            />
            {/* Dégradé localisé bas uniquement pour rendre le prix lisible */}
            <View pointerEvents="none" style={styles.priceGradient} />

            {/* Category Badge */}
            <View style={[styles.catBadge, { backgroundColor: catBg, borderColor: catBorder }]}>
              <View style={[styles.catDot, { backgroundColor: catFg }]} />
              <Text style={[styles.catText, { color: catFg }]}>{catLabel}</Text>
            </View>

            {/* Rating overlay (haut droite) */}
            {rating !== null && rating !== undefined && (
              <View style={styles.ratingOverlay}>
                <Ionicons name="star" size={11} color="#FFD700" />
                <Text style={styles.ratingOverlayText}>{rating.toFixed(1)}</Text>
              </View>
            )}

            {/* Prix overlay (bas) */}
            <View style={styles.priceOverlay}>
              <Text style={styles.priceText}>{pricePerDay}€</Text>
              <Text style={styles.priceUnit}>/jour</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.body}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {title}
            </Text>

            {/* Rating row */}
            <View style={styles.metaRow}>
              {rating !== null && rating !== undefined ? (
                <View style={styles.metaItem}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= Math.floor(rating) ? "star" : s - 0.5 <= rating ? "star-half" : "star-outline"}
                        size={11}
                        color={s <= rating ? "#FFD700" : colors.textTertiary}
                      />
                    ))}
                  </View>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {rating.toFixed(1)} · {reviewCount} avis
                  </Text>
                </View>
              ) : (
                <Text style={[styles.metaText, { color: colors.textTertiary, fontStyle: "italic" }]}>
                  {"Pas encore d'avis"}
                </Text>
              )}
            </View>

            {/* Location */}
            <View style={styles.metaItem}>
              <Ionicons name="location" size={12} color="#10B981" />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{location}</Text>
            </View>

            {/* Owner row */}
            <View style={[styles.ownerRow, { borderTopColor: colors.border }]}>
              {ownerAvatar ? (
                <Photo uri={ownerAvatar} largeur={32} style={styles.avatar} alt="" icone="person-outline" />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryTint, borderColor: colors.surfaceGlassBorder }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.ownerNameRow}>
                  <Text style={[styles.ownerName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {ownerName}
                  </Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  )}
                </View>
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {isVerified ? "Propriétaire vérifié" : "Propriétaire"}
                </Text>
              </View>
            </View>

            {/* CTA buttons */}
            {!isOwnListing && (onBook || onContact) && (
              <View style={styles.actions}>
                {onBook && (
                  <TouchableOpacity accessibilityRole="button"
                    accessibilityLabel={`Réserver ${title}`}
                    activeOpacity={0.85}
                    onPress={onBook}
                    style={[styles.btnPrimary, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.34, radius: 14, offsetY: 5 })]}
                    testID="card-book-btn"
                  >
                    <Text style={[styles.btnPrimaryText, { color: colors.textInverse }]}>Réserver</Text>
                  </TouchableOpacity>
                )}
                {onContact && (
                  <TouchableOpacity accessibilityRole="button"
                    accessibilityLabel={`Contacter le propriétaire de ${title}`}
                    activeOpacity={0.85}
                    onPress={onContact}
                    style={[styles.btnSecondary, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    testID="card-contact-btn"
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textPrimary} />
                    <Text style={[styles.btnSecondaryText, { color: colors.textPrimary }]}>Contacter</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {isOwnListing && (
              <View style={[styles.ownBadge, { backgroundColor: colors.primaryTint, borderColor: colors.surfaceGlassBorder }]}>
                <Ionicons name="ribbon-outline" size={12} color={colors.primary} />
                <Text style={[styles.ownBadgeText, { color: colors.primary }]}>Votre annonce</Text>
              </View>
            )}
          </View>

          {/* Glow effect bottom on hover */}
          {hovered && (
            <View pointerEvents="none" style={styles.glow} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  imgWrap: {
    width: "100%",
    height: 164,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#111",
  },
  img: { width: "100%", height: "100%" },
  // Petit dégradé localisé uniquement en bas pour que le prix blanc reste lisible.
  // On utilise un linear-gradient sur web ; sur natif → simple fond semi-noir bas.
  priceGradient: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: 80,
    ...(Platform.OS === "web"
      ? { backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)" as any }
      : { backgroundColor: "rgba(0,0,0,0.35)" }),
  },

  // Category badge
  catBadge: {
    position: "absolute",
    top: 14, left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    ...(Platform.OS === "web" ? { backdropFilter: "blur(10px)" as any } : {}),
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },

  // Rating overlay
  ratingOverlay: {
    position: "absolute", top: 14, right: 14,
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    ...(Platform.OS === "web" ? { backdropFilter: "blur(10px)" as any } : {}),
  },
  ratingOverlayText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // Price overlay
  priceOverlay: {
    position: "absolute", bottom: 14, left: 16,
    flexDirection: "row", alignItems: "baseline", gap: 3,
  },
  priceText: { color: "#fff", fontSize: 26, fontWeight: "700", letterSpacing: -0.8 },
  priceUnit: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },

  // Body
  body: { padding: 14, gap: 7 },
  title: { fontSize: 15, fontWeight: "600", letterSpacing: -0.2, lineHeight: 19 },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontWeight: "600" },
  starsRow: { flexDirection: "row", gap: 1 },

  // Owner
  ownerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingTop: 12, marginTop: 4,
    borderTopWidth: 1,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: { fontSize: 13, fontWeight: "600" },
  ownerNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ownerName: { fontSize: 13, fontWeight: "700" },
  ownerLabel: { fontSize: 11, marginTop: 1 },

  // Buttons
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  btnPrimary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: "center",
  },
  btnPrimaryText: { fontSize: 13, fontWeight: "600" },
  btnSecondary: {
    flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnSecondaryText: { fontSize: 12, fontWeight: "600" },

  ownBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  ownBadgeText: { fontSize: 12, fontWeight: "600" },

  // Glow
  glow: {
    position: "absolute",
    bottom: -20, left: 20, right: 20, height: 40,
    backgroundColor: "rgba(0,108,103,0.24)",
    borderRadius: 8,
    opacity: 0.5,
    ...(Platform.OS === "web" ? { filter: "blur(24px)" as any } : {}),
    zIndex: -1,
  },
});
