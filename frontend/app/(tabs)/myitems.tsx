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
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function MyItems() {
  const { token, user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const data = await apiFetch("/api/listings/owner/me", {}, token);
      setItems(data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
          } catch (e: any) { Alert.alert("Erreur", e.message); }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientBg>
          <SafeAreaView style={styles.empty}>
            <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
            </Glass>
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Connectez-vous</Text>
          </SafeAreaView>
        </GradientBg>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="myitems-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Mes annonces</Text>

          {loading ? (
            <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={{ marginBottom: spacing.md }} testID={`my-item-${item.id}`}>
                  <Glass borderRadius={radius.lg}>
                    <View style={styles.card}>
                      <Image source={{ uri: item.photos[0] }} style={styles.img} />
                      <View style={styles.body}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.location, { color: colors.textSecondary }]}>{item.location?.address}</Text>
                        <View style={styles.bottomRow}>
                          <Text style={[styles.price, { color: colors.primary }]}>{item.price_per_day}€/jour</Text>
                          <View style={styles.actions}>
                            <TouchableOpacity
                              onPress={() => router.push(`/listing/${item.id}`)}
                              style={[styles.actionBtn, { backgroundColor: colors.primaryTint }]}
                              testID={`view-item-${item.id}`}
                            >
                              <Ionicons name="eye" size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => onDelete(item.id)}
                              style={[styles.actionBtn, { backgroundColor: colors.errorBg }]}
                              testID={`delete-item-${item.id}`}
                            >
                              <Ionicons name="trash" size={18} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Glass>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="cube-outline" size={48} color={colors.primary} />
                  </Glass>
                  <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Vous n'avez encore rien publié</Text>
                  <TouchableOpacity
                    style={[styles.cta, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
                    onPress={() => router.push("/(tabs)/create")}
                    testID="empty-create-btn"
                  >
                    <Text style={[styles.ctaText, { color: colors.textInverse }]}>Publier ma première annonce</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 30, fontWeight: "800", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, letterSpacing: -1 },
  list: { padding: spacing.lg, flexGrow: 1, paddingBottom: 140 },
  card: { flexDirection: "row", overflow: "hidden" },
  img: { width: 110, height: 120 },
  body: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
  location: { fontSize: 13, marginTop: 2 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 15, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxl, gap: 12, flex: 1, justifyContent: "center" },
  emptyText: { fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 12 },
  cta: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md, marginTop: 12 },
  ctaText: { fontWeight: "700" },
});
