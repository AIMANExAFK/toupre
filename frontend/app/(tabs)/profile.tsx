import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { Photo } from "../../src/Photo";

export default function Profile() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [unread, setUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<{ rentals: number; listings: number; rating: number | null }>({ rentals: 0, listings: 0, rating: null });

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [msgs, notifs, fullMe, rentals, myListings] = await Promise.all([
        apiFetch("/api/messages/unread-count", {}, token).catch(() => ({ count: 0 })),
        apiFetch("/api/notifications", {}, token).catch(() => []),
        apiFetch("/api/auth/me", {}, token).catch(() => null),
        apiFetch("/api/bookings/me", {}, token).catch(() => []),
        apiFetch("/api/listings/owner/me", {}, token).catch(() => []),
      ]);
      setUnread(msgs.count || 0);
      setNotifUnread((notifs || []).filter((n: any) => !n.read).length);
      setMe(fullMe);
      const rated = (myListings || []).filter((l: any) => l.rating);
      setStats({
        rentals: (rentals || []).length,
        listings: (myListings || []).length,
        rating: rated.length ? rated.reduce((s: number, l: any) => s + l.rating, 0) / rated.length : null,
      });
    } catch {}
  }, [user, token]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const onLogout = async () => {
    await logout();
    router.replace("/auth/otp");
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientBg>
          <SafeAreaView style={styles.guestBox}>
            <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person-outline" size={48} color={colors.primary} />
            </Glass>
            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>Pas encore de compte ?</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
              Connectez-vous pour louer ou publier
            </Text>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.btn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
              onPress={() => router.push("/auth/otp")}
              testID="profile-login-btn"
            >
              <Text style={[styles.btnText, { color: colors.textInverse }]}>Se connecter</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </GradientBg>
      </View>
    );
  }

  const initial = user.name?.charAt(0).toUpperCase() || "U";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="profile-screen">
      <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
            {/* Bloc d'encre en haut ; la carte de statistiques vient le chevaucher,
                comme la carte bancaire sur l'en-tête du tableau de bord Slate. */}
            <View style={[styles.encre, { backgroundColor: colors.ink, paddingTop: insets.top + 28 }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Modifier mon profil"
              onPress={() => router.push("/profil-edit")}
              testID="profile-edit-btn"
              style={styles.header}
              activeOpacity={0.85}
            >
              {user.avatar ? (
                <Photo uri={user.avatar} largeur={88} style={styles.avatar} alt="Votre photo de profil" icone="person-outline" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: "#FFFFFF" }]}>
                  <Text style={[styles.avatarText, { color: "#0A0A0A" }]}>{initial}</Text>
                </View>
              )}
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.onInk }]} testID="profile-name">{user.name}</Text>
                <Ionicons name="pencil-outline" size={15} color={colors.onInkMuted} />
              </View>
              <Text style={[styles.email, { color: colors.onInkMuted }]}>{user.email}</Text>
            </TouchableOpacity>
            </View>

            <View style={styles.statsWrap}>
              <Glass borderRadius={radius.lg} style={styles.statsCard}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.rentals}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Locations</Text>
                </View>
                <View style={[styles.statSep, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.listings}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Annonces</Text>
                </View>
                <View style={[styles.statSep, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.rating ? stats.rating.toFixed(1) : "—"}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>★ Note</Text>
                </View>
              </Glass>
            </View>

            {/* Contact verification banner */}
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push(me?.kyc_status === "verified" ? "/security" : "/auth/otp")} style={styles.menu} activeOpacity={0.8}>
              <Glass borderRadius={radius.lg} style={[styles.trustCard, { borderColor: colors.surfaceGlassBorder }]}>
                <View style={[styles.trustIcon, {
                  backgroundColor: me?.kyc_status === "verified" ? colors.successBg : colors.primaryTint,
                }]}>
                  <Ionicons
                    name={me?.kyc_status === "verified" ? "shield-checkmark" : "shield-outline"}
                    size={22}
                    color={me?.kyc_status === "verified" ? colors.success : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>
                    {me?.kyc_status === "verified" ? "Email et téléphone vérifiés" : me?.kyc_status === "pending" ? "Vérification en cours…" : "Vérifier mes coordonnées"}
                  </Text>
                  <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                    {me?.kyc_status === "verified" ? "Un code a confirmé que vous possédez bien ces coordonnées." : "Recevez un code pour louer et publier."}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Glass>
            </TouchableOpacity>

            {/* Parrainage banner */}
            {me?.credit_balance != null && (
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/referral")} style={styles.menu} activeOpacity={0.8}>
                <Glass borderRadius={radius.lg} style={[styles.trustCard, { backgroundColor: colors.primaryTint + "30" }]}>
                  <View style={[styles.trustIcon, { backgroundColor: colors.primary }]}>
                    <Ionicons name="gift" size={22} color={colors.textInverse} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trustTitle, { color: colors.primary }]}>
                      Parrainage · {me.credit_balance}€ de crédit
                    </Text>
                    <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                      Code <Text style={{ fontWeight: "600", color: colors.textPrimary }}>{me.referral_code}</Text> · Gagnez 10€ par filleul.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </Glass>
              </TouchableOpacity>
            )}

            <View style={styles.menu}>
                <Glass borderRadius={radius.lg} style={styles.menuCard}>
                <MenuItem
                  icon="notifications-outline"
                  label="Notifications"
                  badge={notifUnread > 0 ? notifUnread : undefined}
                  onPress={() => router.push("/notifications")}
                  testID="menu-notifications"
                  colors={colors}
                />
                <Divider colors={colors} />
                <MenuItem
                  icon="chatbubbles-outline"
                  label="Messages"
                  badge={unread > 0 ? unread : undefined}
                  onPress={() => router.push("/messages")}
                  testID="menu-messages"
                  colors={colors}
                />
                <Divider colors={colors} />
                <MenuItem icon="calendar-outline" label="Mes locations" onPress={() => router.push("/(tabs)/bookings")} testID="menu-bookings" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="cube-outline" label="Mes annonces" onPress={() => router.push("/(tabs)/myitems")} testID="menu-listings" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="add-circle-outline" label="Publier une annonce" onPress={() => router.push("/(tabs)/create")} testID="menu-create" colors={colors} />
              </Glass>
            </View>

            <View style={styles.menu}>
                <Glass borderRadius={radius.lg} style={styles.menuCard}>
                <MenuItem icon="finger-print-outline" label="Sécurité & sessions" onPress={() => router.push("/security")} testID="menu-security" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="cash-outline" label="Paiement en espèces" onPress={() => router.push("/payments")} testID="menu-payments" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="settings-outline" label="Paramètres" onPress={() => router.push("/settings")} testID="menu-settings" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="help-circle-outline" label="Aide & support" onPress={() => router.push("/help")} testID="menu-help" colors={colors} />
              </Glass>
            </View>

            <TouchableOpacity accessibilityRole="button" onPress={onLogout} testID="logout-btn" style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <Glass borderRadius={radius.md} style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.logoutText, { color: colors.error }]}>Se déconnecter</Text>
              </Glass>
            </TouchableOpacity>
          </ScrollView>
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />;
}

function MenuItem({ icon, label, onPress, testID, colors, badge }: any) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.menuItem} onPress={onPress} testID={testID}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{label}</Text>
      {badge !== undefined && (
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textInverse }}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  encre: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 52 },
  header: { alignItems: "center", paddingHorizontal: spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, fontWeight: "600" },
  name: { fontSize: 24, fontWeight: "700", marginTop: spacing.md, letterSpacing: 0 },
  email: { fontSize: 14, marginTop: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statsWrap: { paddingHorizontal: spacing.lg, marginTop: -36, zIndex: 2 },
  statsCard: { flexDirection: "row", padding: spacing.md, alignItems: "center" },
  statBox: { flex: 1, alignItems: "center" },
  statSep: { width: 1, height: 32 },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },
  menu: { marginTop: spacing.lg, marginHorizontal: spacing.lg },
  trustCard: { padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1 },
  trustIcon: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  trustTitle: { fontSize: 15, fontWeight: "700" },
  trustText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  menuCard: { borderWidth: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 14, gap: spacing.md },
  menuIcon: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "700" },
  logoutText: { fontWeight: "700", fontSize: 15 },
  guestBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 8 },
  guestTitle: { fontSize: 22, fontWeight: "600", marginTop: 16 },
  guestSub: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999, marginTop: 8 },
  btnText: { fontWeight: "700", fontSize: 15 },
});
