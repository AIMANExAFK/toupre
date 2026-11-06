import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing } from "./theme";
import { useAuth } from "./auth";

type Provider = "google" | "apple" | "microsoft";

type ProviderConfig = {
  key: Provider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

// Google et Microsoft gardent leur couleur de marque ; Apple suit le thème
// (noir sur clair, blanc sur sombre) comme le veulent ses règles d'affichage.
const PROVIDERS: ProviderConfig[] = [
  { key: "google",    label: "Continuer avec Google",    icon: "logo-google",    iconColor: "#4285F4" },
  { key: "apple",     label: "Continuer avec Apple",     icon: "logo-apple",     iconColor: "" },
  { key: "microsoft", label: "Continuer avec Microsoft", icon: "logo-microsoft", iconColor: "#00A4EF" },
];

export function SocialAuthButtons({
  onError,
  onBusyChange,
}: {
  onError?: (message: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { colors } = useTheme();
  const { loginWithGoogle, loginWithApple, loginWithMicrosoft } = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);

  // Apple n'est pas proposé sur Android (pas de connexion Apple native) : on le
  // garde sur iOS et sur le web, où Supabase gère le flux OAuth Apple.
  const providers = PROVIDERS.filter((p) => !(p.key === "apple" && Platform.OS === "android"));

  const handlers: Record<Provider, () => Promise<void>> = {
    google: loginWithGoogle,
    apple: loginWithApple,
    microsoft: loginWithMicrosoft,
  };

  const press = async (p: Provider) => {
    if (busy) return;
    onError?.(null);
    setBusy(p);
    onBusyChange?.(true);
    try {
      await handlers[p]();
    } catch (e: any) {
      onError?.(e?.message || "Connexion impossible pour le moment.");
    } finally {
      setBusy(null);
      onBusyChange?.(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.sep}>
        <View style={[styles.trait, { backgroundColor: colors.border }]} />
        <Text style={[styles.sepTxt, { color: colors.textTertiary }]}>ou</Text>
        <View style={[styles.trait, { backgroundColor: colors.border }]} />
      </View>

      {providers.map((p) => {
        const loading = busy === p.key;
        return (
          <TouchableOpacity
            key={p.key}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            onPress={() => press(p.key)}
            disabled={!!busy}
            style={[
              styles.btn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy && !loading ? 0.5 : 1 },
            ]}
            testID={`social-${p.key}-btn`}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name={p.icon} size={20} color={p.iconColor || colors.textPrimary} />
                <Text style={[styles.btnTxt, { color: colors.textPrimary }]}>{p.label}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  sep: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: spacing.xs },
  trait: { flex: 1, height: 1 },
  sepTxt: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    minHeight: 52, borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 16,
  },
  btnTxt: { fontSize: 15, fontWeight: "600" },
});
