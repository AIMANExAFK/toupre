import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { BACKEND_URL, useAuth } from "../../src/auth";

type Step = "email" | "code";

export default function OtpFlow() {
  const router = useRouter();
  const colors = useColors();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emailValid = EMAIL_REGEX.test(email.trim());
  const codeStr = code.join("");
  const codeValid = codeStr.length === 6;

  // Countdown pour renvoyer
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const requestOTP = async () => {
    if (!emailValid) { setError("Email invalide"); return; }
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "Erreur"); return; }
      setStep("code");
      setResendIn(30);
      setDevCode(data._dev_code || null); // mode démo
      setTimeout(() => inputs.current[0]?.focus(), 200);
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!codeValid) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: codeStr }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "Code incorrect"); setCode(["", "", "", "", "", ""]); inputs.current[0]?.focus(); return; }
      // Sauvegarde la session
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.setItem("ls_token", data.access_token);
        localStorage.setItem("ls_user", JSON.stringify(data.user));
      }
      await refreshUser();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const onDigitChange = (idx: number, value: string) => {
    // Permet aussi le collage du code complet
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...code];
      digits.forEach((d, i) => { if (idx + i < 6) next[idx + i] = d; });
      setCode(next);
      const last = Math.min(idx + digits.length, 5);
      inputs.current[last]?.focus();
      if (next.join("").length === 6) setTimeout(verifyOTP, 100);
      return;
    }
    const next = [...code];
    next[idx] = value.replace(/\D/g, "");
    setCode(next);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === "Backspace" && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => step === "code" ? setStep("email") : router.back()}
              style={styles.iconBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Code par email</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">

            {step === "email" ? (
              <>
                <View style={{ alignItems: "center", marginTop: 16, marginBottom: 8 }}>
                  <View style={[styles.heroIco, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="mail-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Saisissez votre email</Text>
                  <Text style={[styles.sub, { color: colors.textSecondary }]}>
                    Nous vous enverrons un code à 6 chiffres valable 10 minutes.
                  </Text>
                </View>

                <Glass borderRadius={radius.lg} style={{ padding: spacing.md }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Adresse email</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.surface2, borderColor: emailValid ? colors.primary : colors.border }]}>
                    <Ionicons name="at-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="vous@exemple.com"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      style={[styles.input, { color: colors.textPrimary }]}
                      autoFocus
                      onSubmitEditing={requestOTP}
                      testID="otp-email-input"
                    />
                  </View>
                </Glass>

                {error && (
                  <View style={[styles.errBox, { backgroundColor: colors.errorBg }]}>
                    <Ionicons name="alert-circle" size={15} color={colors.error} />
                    <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={requestOTP}
                  disabled={!emailValid || loading}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: emailValid ? colors.primary : colors.border },
                    emailValid && shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
                  ]}
                  testID="otp-send-btn"
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <Text style={[styles.primaryBtnText, { color: emailValid ? colors.textInverse : colors.textTertiary }]}>
                        Envoyer le code
                      </Text>
                      <Ionicons name="paper-plane-outline" size={17} color={emailValid ? colors.textInverse : colors.textTertiary} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ alignItems: "center", marginTop: 16, marginBottom: 8 }}>
                  <View style={[styles.heroIco, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="keypad-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Vérifiez votre boîte mail</Text>
                  <Text style={[styles.sub, { color: colors.textSecondary }]}>
                    Nous avons envoyé un code à 6 chiffres à{"\n"}
                    <Text style={{ fontWeight: "800", color: colors.textPrimary }}>{email}</Text>
                  </Text>
                </View>

                {devCode && (
                  <Glass borderRadius={radius.lg} style={[styles.devBanner, { borderColor: colors.warning || "#F59E0B" }]}>
                    <Ionicons name="construct-outline" size={16} color={colors.warning || "#F59E0B"} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.devTitle, { color: colors.textPrimary }]}>Mode démo</Text>
                      <Text style={[styles.devText, { color: colors.textSecondary }]}>
                        Votre code : <Text style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontWeight: "900", fontSize: 16, color: colors.warning || "#F59E0B" }}>{devCode}</Text>
                      </Text>
                    </View>
                  </Glass>
                )}

                <View style={styles.codeRow}>
                  {code.map((c, i) => (
                    <TextInput
                      key={i}
                      ref={(r) => {
                        inputs.current[i] = r;
                      }}
                      value={c}
                      onChangeText={(v) => onDigitChange(i, v)}
                      onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={[
                        styles.codeBox,
                        {
                          backgroundColor: colors.surface2,
                          color: colors.textPrimary,
                          borderColor: c ? colors.primary : colors.border,
                        },
                      ]}
                      textContentType="oneTimeCode"
                      autoComplete="one-time-code"
                      testID={`otp-digit-${i}`}
                    />
                  ))}
                </View>

                {error && (
                  <View style={[styles.errBox, { backgroundColor: colors.errorBg }]}>
                    <Ionicons name="alert-circle" size={15} color={colors.error} />
                    <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={verifyOTP}
                  disabled={!codeValid || loading}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: codeValid ? colors.primary : colors.border },
                    codeValid && shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
                  ]}
                  testID="otp-verify-btn"
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: codeValid ? colors.textInverse : colors.textTertiary }]}>
                      Vérifier le code
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Pas reçu de code ? </Text>
                  {resendIn > 0 ? (
                    <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: "700" }}>
                      Renvoyer dans {resendIn}s
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={requestOTP}>
                      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>Renvoyer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },

  heroIco: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  sub: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6, paddingHorizontal: spacing.md },

  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 15 },

  errBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.sm },

  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: radius.md, marginTop: spacing.sm },
  primaryBtnText: { fontSize: 15, fontWeight: "800" },

  // Code boxes
  codeRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: spacing.md },
  codeBox: {
    width: 46, height: 56,
    borderWidth: 2, borderRadius: 12,
    textAlign: "center",
    fontSize: 26, fontWeight: "900",
    letterSpacing: -0.5,
  },

  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.md },

  // Dev banner
  devBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1 },
  devTitle: { fontSize: 12, fontWeight: "800" },
  devText: { fontSize: 13, marginTop: 1 },
});
