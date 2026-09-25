import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../src/auth";
import { useColors, spacing, radius } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";
import { EnTeteSombre, BoutonEnTete } from "../src/EnTeteSombre";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, any> = {
  booking_request: "calendar-outline",
  booking_confirmed: "checkmark-circle",
  booking_refused: "close-circle",
  booking_paid: "cash-outline",
  booking_cancelled: "ban-outline",
  new_message: "chatbubble-ellipses-outline",
  kyc_verified: "shield-checkmark",
  referral_credit: "gift-outline",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const colors = useColors();
  const [items, setItems] = useState<Notif[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch("/api/notifications", {}, token);
      setItems(r || []);
    } catch (e) { console.log(e); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" }, token);
      load();
    } catch {}
  };

  const tap = async (n: Notif) => {
    try {
      await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" }, token);
    } catch {}
    if (n.type === "new_message" && n.data?.from_id) router.push(`/messages/${n.data.from_id}`);
    else if (n.type.startsWith("booking_")) router.push("/(tabs)/myitems");
    else if (n.type === "referral_credit") router.push("/referral");
    else if (n.type === "kyc_verified") router.push("/auth/otp");
    load();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <EnTeteSombre
            titre={<>Notifications {unread > 0 ? `(${unread})` : ""}</>}
            retour={() => router.back()}
            droite={unread > 0 ? (
              // Sur l'en-tête noir : action en rond translucide, comme les autres
              <BoutonEnTete icone="checkmark-done" libelle="Tout marquer comme lu" onPress={markAllRead} />
            ) : undefined}
          />

          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: spacing.sm }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={56} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Aucune notification</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Réservations, messages et événements apparaîtront ici.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity accessibilityRole="button" onPress={() => tap(item)} activeOpacity={0.7}>
                <Glass borderRadius={radius.lg} style={styles.notif}>
                  <View style={[styles.notifIcon, { backgroundColor: item.read ? colors.surface2 : colors.primaryTint }]}>
                    <Ionicons
                      name={TYPE_ICON[item.type] || "notifications-outline"}
                      size={20}
                      color={item.read ? colors.textSecondary : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary, fontWeight: item.read ? "600" : "800" }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                  {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                </Glass>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  empty: { paddingVertical: spacing.xl * 2, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "600", marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: spacing.xl },
  notif: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  notifIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  notifTitle: { fontSize: 14 },
  notifBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  notifTime: { fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
