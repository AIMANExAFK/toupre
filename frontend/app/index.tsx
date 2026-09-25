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
    // Comme dans Slate, on ouvre directement sur le splash puis la connexion,
    // tous deux portés par l'écran de code (pas d'écran d'accueil intermédiaire).
    else router.replace("/auth/otp");
  }, [user, loading, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.ink }]} testID="splash-screen">
      <ActivityIndicator size="large" color={colors.onInk} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
