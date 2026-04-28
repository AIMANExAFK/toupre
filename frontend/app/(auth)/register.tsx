import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setErr(null);
    if (!name || !email || password.length < 6) {
      setErr("Remplissez tous les champs (mot de passe min. 6 caractères)");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="register-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity onPress={() => router.back()}>
                <Glass borderRadius={22} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </Glass>
              </TouchableOpacity>

              <Text style={[styles.title, { color: colors.textPrimary }]}>Créer un compte</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Rejoignez la communauté LocaShare
              </Text>

              <Glass borderRadius={radius.lg} style={styles.formCard}>
                <View style={styles.formInner}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Prénom</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    placeholder="Jean"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={colors.textTertiary}
                    testID="register-name-input"
                  />

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    placeholder="vous@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholderTextColor={colors.textTertiary}
                    testID="register-email-input"
                  />

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Mot de passe</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    placeholder="6 caractères minimum"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor={colors.textTertiary}
                    testID="register-password-input"
                  />

                  {err && (
                    <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={[styles.errorText, { color: colors.error }]}>{err}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      { backgroundColor: colors.primary },
                      shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 }),
                    ]}
                    onPress={onSubmit}
                    disabled={loading}
                    testID="register-submit-btn"
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={[styles.btnText, { color: colors.textInverse }]}>
                        Créer mon compte
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Glass>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Déjà un compte ?{" "}
                </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={[styles.footerLink, { color: colors.primary }]}>Se connecter</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, flexGrow: 1 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 15, marginTop: spacing.sm, marginBottom: spacing.xl },
  formCard: { padding: 4, marginBottom: spacing.lg },
  formInner: { padding: spacing.md },
  label: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  btn: { borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.lg },
  btnText: { fontSize: 16, fontWeight: "700" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  errorText: { fontSize: 14, flex: 1 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  footerText: { fontSize: 14 },
  footerLink: { fontWeight: "700", fontSize: 14 },
});
