import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider, useAuth, BACKEND_URL } from "../src/auth";
import { ThemeProvider, useTheme, shadowStyle } from "../src/theme";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, StyleSheet, View } from "react-native";
import { NotificationsManager } from "../src/NotificationsManager";

// ─── Suppression définitive des outlines focus (web only) ───
// Injecte le CSS en bout de <head> APRÈS les styles RN Web pour gagner la cascade
function useNoFocusOutline() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (document.getElementById("no-focus-outline")) return;
    const s = document.createElement("style");
    s.id = "no-focus-outline";
    s.textContent = `
      html body *,
      html body *:focus,
      html body *:focus-visible,
      html body *:focus-within {
        outline: 0 none transparent !important;
        outline-width: 0 !important;
        outline-style: none !important;
        outline-color: transparent !important;
        outline-offset: 0 !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-focus-ring-color: transparent !important;
      }
      html body input:focus,
      html body input:focus-visible,
      html body textarea:focus,
      html body textarea:focus-visible,
      html body select:focus,
      html body select:focus-visible,
      html body button:focus,
      html body button:focus-visible,
      html body a:focus,
      html body a:focus-visible,
      html body [tabindex]:focus,
      html body [tabindex]:focus-visible,
      html body [role]:focus,
      html body [role]:focus-visible,
      html body [data-focusable]:focus,
      html body [data-focusable]:focus-visible {
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(s);
  }, []);
}

// ─── Push notifications : SW + polling backend ───
function useNotifications() {
  const { token, user } = useAuth();

  // Enregistre le service worker au mount
  useEffect(() => {
    if (Platform.OS !== "web") return;
    NotificationsManager.registerServiceWorker();
  }, []);

  // Quand l'utilisateur se connecte, enregistre son push token côté backend
  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      const pushToken = await NotificationsManager.getPushToken();
      if (!pushToken) return;
      try {
        await fetch(`${BACKEND_URL}/api/push/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: pushToken, device: navigator.userAgent.split(") ")[0] + ")" }),
        });
      } catch {}
    })();
  }, [user, token]);

  // Poll des notifications délégué au singleton de NotificationsManager :
  // une seule boucle pour toute l'app, même si ce hook est monté plusieurs fois
  useEffect(() => {
    if (!user || !token) return;
    NotificationsManager.startPolling(token, BACKEND_URL);
    return () => NotificationsManager.stopPolling();
  }, [user, token]);
}

function RootShell() {
  const { isDark, colors } = useTheme();
  const isWeb = Platform.OS === "web";
  useNoFocusOutline();
  useNotifications();

  return (
    <View
      style={[
        styles.stage,
        isWeb && styles.webStage,
        { backgroundColor: isWeb ? colors.surface2 : colors.bg },
      ]}
    >
      <View
        style={[
        styles.appFrame,
        isWeb && styles.webFrame,
        isWeb && shadowStyle({ color: colors.primaryDark, opacity: 0.14, radius: 44, offsetY: 18 }),
        { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
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
          <Stack.Screen name="booking/constat" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="booking/constats" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="payments" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="help" options={{ animation: "slide_from_right" }} />
        </Stack>
      </View>
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

const styles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  webStage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  appFrame: {
    flex: 1,
    width: "100%",
  },
  webFrame: {
    maxWidth: 450,
    maxHeight: 920,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
});
