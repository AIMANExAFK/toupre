import { useEffect, useState, useCallback } from "react";
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
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius } from "../../src/theme";
import { Glass } from "../../src/Glass";
import { SkeletonBox } from "../../src/Skeleton";

type Conversation = {
  peer_id: string;
  peer: { id: string; name: string; avatar: string | null };
  last_message: string;
  last_at: string;
  unread: number;
  listing: { id: string; title: string; photos: string[] } | null;
};

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch("/api/conversations");
      setConvs(data || []);
    } catch (e) {
      console.log("[messages]", e);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Ionicons name="lock-closed-outline" size={52} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Connexion requise</Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={[styles.emptyLink, { color: colors.primary }]}>Se connecter</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <Glass borderRadius={0} style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Messages</Text>
          <View style={{ width: 32 }} />
        </Glass>
      </SafeAreaView>

      {loading ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} width="100%" height={72} borderRadius={radius.lg} />
          ))}
        </View>
      ) : convs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Aucune conversation</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Vos échanges avec les propriétaires apparaîtront ici.
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)")}>
            <Text style={[styles.emptyLink, { color: colors.primary }]}>Explorer les annonces</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(item) => item.peer_id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/messages/${item.peer_id}${item.listing ? `?listingId=${item.listing.id}` : ""}`)}
              activeOpacity={0.7}
              testID={`conv-${item.peer_id}`}
            >
              <Glass borderRadius={radius.lg} style={[styles.convCard, item.unread > 0 && { borderColor: colors.primary, borderWidth: 1 }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                    {item.peer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.convHead}>
                    <Text style={[styles.convName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.peer.name}
                    </Text>
                    <Text style={[styles.convTime, { color: colors.textTertiary }]}>
                      {formatTime(item.last_at)}
                    </Text>
                  </View>
                  {item.listing && (
                    <Text style={[styles.convListing, { color: colors.primary }]} numberOfLines={1}>
                      📍 {item.listing.title}
                    </Text>
                  )}
                  <Text style={[styles.convMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.last_message}
                  </Text>
                </View>
                {item.unread > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.unreadText, { color: colors.textInverse }]}>{item.unread}</Text>
                  </View>
                )}
              </Glass>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const styles = StyleSheet.create({
  headerWrap: { zIndex: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: spacing.xl },
  emptyLink: { fontSize: 14, fontWeight: "700", marginTop: spacing.sm },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800" },
  convHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  convName: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: spacing.sm },
  convTime: { fontSize: 11, fontWeight: "600" },
  convListing: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  convMsg: { fontSize: 13, lineHeight: 18 },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center", justifyContent: "center",
  },
  unreadText: { fontSize: 11, fontWeight: "800" },
});
