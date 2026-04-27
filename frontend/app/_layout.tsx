import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="booking/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="payment-success" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
