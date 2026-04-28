import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth";
import { ThemeProvider, useTheme } from "../src/theme";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";

function RootShell() {
  const { isDark, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listing/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="booking/[id]" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="payment-success" />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="payments" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="help" options={{ animation: "slide_from_right" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootShell />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
