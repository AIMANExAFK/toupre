import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/supabase";
import { useColors } from "../../src/theme";

export default function AuthCallback() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const handle = async () => {
      if (params.code) {
        // Exchange PKCE code for session
        const url = `locashare://auth/callback?code=${params.code}`;
        await supabase.auth.exchangeCodeForSession(url).catch(console.error);
      }
      router.replace("/(tabs)");
    };
    handle();
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
