import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth";
import { useColors } from "../src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/(tabs)");
    else router.replace("/(auth)/welcome");
  }, [user, loading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]} testID="splash-screen">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
