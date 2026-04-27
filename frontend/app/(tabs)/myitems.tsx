import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../../src/auth";
import { colors, spacing, radius, shadows } from "../../src/theme";

export default function MyItems() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch("/api/listings/owner/me", {}, token);
      setItems(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = (id: string) => {
    Alert.alert("Supprimer ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/listings/${id}`, { method: "DELETE" }, token);
            load();
          } catch (e: any) {
            Alert.alert("Erreur", e.message);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Connectez-vous pour voir vos biens</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="myitems-screen" edges={["top"]}>
      <Text style={styles.heading}>Mes biens en location</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`my-item-${item.id}`}>
              <Image source={{ uri: item.photos[0] }} style={styles.img} />
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.location}>{item.location?.address}</Text>
                <View style={styles.bottomRow}>
                  <Text style={styles.price}>{item.price_per_day}€/jour</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => router.push(`/listing/${item.id}`)}
                      style={styles.actionBtn}
                      testID={`view-item-${item.id}`}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDelete(item.id)}
                      style={styles.actionBtn}
                      testID={`delete-item-${item.id}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Vous n'avez encore rien publié</Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => router.push("/(tabs)/create")}
                testID="empty-create-btn"
              >
                <Text style={styles.ctaText}>Publier ma première annonce</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    letterSpacing: -0.5,
  },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  img: { width: 100, height: 110, backgroundColor: colors.surface2 },
  body: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  location: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 15, fontWeight: "700", color: colors.primary },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: "center" },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 12,
  },
  ctaText: { color: colors.surface, fontWeight: "600" },
});
