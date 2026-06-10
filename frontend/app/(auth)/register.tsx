import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";

const CGU_URL = "http://localhost:8182/cgu.html";
const PRIVACY_URL = "http://localhost:8182/confidentialite.html";

const Svg = "svg" as any;
const SvgPath = "path" as any;
function injectFloatingCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("fl-css")) return;
  const s = document.createElement("style");
  s.id = "fl-css";
  s.textContent = `@keyframes fl{0%{stroke-dashoffset:1500;opacity:.12;}50%{opacity:.4;}100%{stroke-dashoffset:-1500;opacity:.12;}}.fl-path{stroke-dasharray:400 600;animation:fl linear infinite;}`;
  document.head.appendChild(s);
}
function FloatingPaths({ position }: { position: number }) {
  if (Platform.OS !== "web") return null;
  injectFloatingCSS();
  const paths = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    dur: `${18 + i * 0.6}s`, delay: `${-(i * 0.9)}s`, w: 0.25 + i * 0.025,
  }));
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg viewBox="0 0 696 316" style={{ width: "100%", height: "100%", position: "absolute" }} fill="none">
        {paths.map((p) => (
          <SvgPath key={p.id} className="fl-path" d={p.d}
            stroke="rgba(124,58,237,0.7)" strokeWidth={p.w}
            style={{ animationDuration: p.dur, animationDelay: p.delay }} />
        ))}
      </Svg>
    </View>
  );
}

function Logo({ light = false, colors }: { light?: boolean; colors: any }) {
  return (
    <View style={s.logoRow}>
      <View style={[s.logoIcon, { backgroundColor: colors.primary }]}>
        <Text style={s.logoLetter}>L</Text>
      </View>
      <Text style={[s.logoText, { color: light ? "#fff" : colors.textPrimary }]}>LocaShare</Text>
    </View>
  );
}

function IconInput({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, testID, colors }: any) {
  return (
    <View style={[s.iconInput, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
      <Ionicons name={icon} size={17} color={colors.textTertiary} style={{ marginLeft: 14 }} />
      <TextInput style={[s.iconInputText, { color: colors.textPrimary }]}
        placeholder={placeholder} placeholderTextColor={colors.textTertiary}
        value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} autoCapitalize={autoCapitalize} testID={testID} />
    </View>
  );
}

function Sep({ colors }: { colors: any }) {
  return (
    <View style={s.sepRow}>
      <View style={[s.sepLine, { backgroundColor: colors.border }]} />
      <Text style={[s.sepTxt, { color: colors.textTertiary }]}>OU</Text>
      <View style={[s.sepLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

const GoogleSVG = "svg" as any;
const GooglePath = "path" as any;
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <GoogleSVG width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <GooglePath d="M12.479 14.265v-3.279h11.049c.108.571.164 1.247.164 1.979 0 2.46-.672 5.502-2.84 7.669C18.744 22.829 16.051 24 12.483 24 5.869 24 .308 18.613.308 12S5.869 0 12.483 0c3.659 0 6.265 1.436 8.223 3.307L18.392 5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65 3.279 3.873 7.171 3.873 12s3.777 8.721 8.606 8.721c3.132 0 4.916-1.258 6.059-2.401.927-.927 1.537-2.251 1.777-4.059L12.479 14.265z" />
    </GoogleSVG>
  );
}

// Désactive le split layout — formulaire seul, fonctionne sur toutes les tailles
const IS_SPLIT = false;

export default function Register() {
  const { register, loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralCheck, setReferralCheck] = useState<{ valid?: boolean; sponsor_name?: string; reward?: number } | null>(null);
  const [err, setErr]           = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleError = (e: any) => setErr(e?.message ?? "Une erreur est survenue");

  // ─── Validations strictes ───
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emailValid = email.length > 0 && EMAIL_REGEX.test(email.trim());

  // Mot de passe : 8+ chars, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
  const pwdChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\];'/\\`~]/.test(password),
  };
  const pwdScore = Object.values(pwdChecks).filter(Boolean).length;
  const passwordStrong = pwdScore === 5;
  const passwordMatch = confirmPassword.length > 0 && password === confirmPassword;

  const nameValid = name.trim().length >= 2;

  const canSubmit = nameValid && emailValid && passwordStrong && passwordMatch && termsAccepted && !loading;

  const checkReferral = async (code: string) => {
    setReferralCheck(null);
    if (!code || code.length < 3) return;
    try {
      const backend = (process as any).env?.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const r = await fetch(`${backend}/api/referral/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      setReferralCheck(j);
    } catch {}
  };

  const onSubmit = async () => {
    setErr(null);
    if (!nameValid) { setErr("Le prénom doit contenir au moins 2 caractères."); return; }
    if (!emailValid) { setErr("Veuillez saisir une adresse email valide."); return; }
    if (!passwordStrong) {
      setErr("Le mot de passe doit contenir au moins 8 caractères, dont 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.");
      return;
    }
    if (!passwordMatch) { setErr("Les mots de passe ne correspondent pas."); return; }
    if (!termsAccepted) {
      setErr("Vous devez accepter les CGU et la Politique de confidentialité pour continuer.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim(), referralCode.trim().toUpperCase() || undefined);
      router.replace("/(tabs)");
    }
    catch (e: any) { handleError(e); }
    finally { setLoading(false); }
  };

  const onGoogle = async () => {
    setErr(null); setOauthLoading("google");
    try { await loginWithGoogle(); }
    catch (e: any) { handleError(e); }
    finally { setOauthLoading(null); }
  };

  const onApple = async () => {
    setErr(null); setOauthLoading("apple");
    try { await loginWithApple(); }
    catch (e: any) { handleError(e); }
    finally { setOauthLoading(null); }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]} testID="register-screen">
      {IS_SPLIT && (
        <View style={[s.left, { backgroundColor: "#07070c", borderRightColor: colors.border }]}>
          <FloatingPaths position={1} /><FloatingPaths position={-1} />
          <View style={s.leftTop}><Logo light colors={colors} /></View>
          <View style={s.leftBottom}>
            <Text style={s.quote}>{"J'ai mis ma perceuse en location le jour même.\nSimple, rapide et rentable !"}</Text>
            <Text style={s.quoteAuthor}>~ Thomas B.</Text>
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[s.orb, { backgroundColor: colors.primaryTint }]} pointerEvents="none" />

              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                <Text style={[s.backTxt, { color: colors.textSecondary }]}>Retour</Text>
              </TouchableOpacity>

              <View style={s.form}>
                {!IS_SPLIT && <Logo colors={colors} />}
                <Text style={[s.title, { color: colors.textPrimary }]}>Créer un compte ✨</Text>
                <Text style={[s.subtitle, { color: colors.textSecondary }]}>Rejoignez la communauté LocaShare</Text>

                {/* OAuth */}
                <TouchableOpacity
                  style={[s.oauthBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={onGoogle} disabled={!!oauthLoading} activeOpacity={0.75}
                >
                  {oauthLoading === "google"
                    ? <ActivityIndicator size="small" color={colors.textPrimary} />
                    : <><GoogleIcon size={17} /><Text style={[s.oauthTxt, { color: colors.textPrimary }]}>Continuer avec Google</Text></>}
                </TouchableOpacity>

                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    style={[s.oauthBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={onApple} disabled={!!oauthLoading} activeOpacity={0.75}
                  >
                    {oauthLoading === "apple"
                      ? <ActivityIndicator size="small" color={colors.textPrimary} />
                      : <><Ionicons name="logo-apple" size={18} color={colors.textPrimary} /><Text style={[s.oauthTxt, { color: colors.textPrimary }]}>Continuer avec Apple</Text></>}
                  </TouchableOpacity>
                )}

                <Sep colors={colors} />
                <Text style={[s.helper, { color: colors.textTertiary }]}>Créez votre compte avec email et mot de passe</Text>

                <View style={s.inputs}>
                  <IconInput icon="person-outline" placeholder="Votre prénom" value={name} onChangeText={setName} autoCapitalize="words" testID="register-name-input" colors={colors} />
                  {name.length > 0 && !nameValid && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
                      <Ionicons name="close-circle" size={14} color={colors.error} />
                      <Text style={{ fontSize: 12, color: colors.error, fontWeight: "700" }}>Minimum 2 caractères</Text>
                    </View>
                  )}

                  <IconInput icon="at-outline" placeholder="votre.email@exemple.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="register-email-input" colors={colors} />
                  {email.length > 0 && !emailValid && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
                      <Ionicons name="close-circle" size={14} color={colors.error} />
                      <Text style={{ fontSize: 12, color: colors.error, fontWeight: "700" }}>{"Format d'email invalide"}</Text>
                    </View>
                  )}
                  {emailValid && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={{ fontSize: 12, color: colors.success, fontWeight: "700" }}>Email valide</Text>
                    </View>
                  )}

                  <IconInput icon="lock-closed-outline" placeholder="Mot de passe sécurisé" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" testID="register-password-input" colors={colors} />

                  {/* Indicateur de force */}
                  {password.length > 0 && (
                    <View style={{ marginTop: -4, gap: 6, paddingHorizontal: 4 }}>
                      {/* Barre de progression */}
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <View
                            key={i}
                            style={{
                              flex: 1, height: 4, borderRadius: 2,
                              backgroundColor: i <= pwdScore
                                ? (pwdScore <= 2 ? colors.error : pwdScore <= 3 ? colors.warning || "#F59E0B" : pwdScore === 4 ? colors.primary : colors.success)
                                : colors.surface2,
                            }}
                          />
                        ))}
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "700" }}>
                        Force : {pwdScore <= 2 ? "Faible" : pwdScore <= 3 ? "Moyen" : pwdScore === 4 ? "Bon" : "Excellent"}
                      </Text>
                      {/* Liste des critères */}
                      <View style={{ gap: 3 }}>
                        {[
                          { ok: pwdChecks.length, label: "Au moins 8 caractères" },
                          { ok: pwdChecks.upper, label: "Une lettre majuscule" },
                          { ok: pwdChecks.lower, label: "Une lettre minuscule" },
                          { ok: pwdChecks.digit, label: "Un chiffre" },
                          { ok: pwdChecks.special, label: "Un caractère spécial (!@#$...)" },
                        ].map((c, i) => (
                          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name={c.ok ? "checkmark-circle" : "ellipse-outline"} size={12} color={c.ok ? colors.success : colors.textTertiary} />
                            <Text style={{ fontSize: 11, color: c.ok ? colors.success : colors.textTertiary, fontWeight: "600" }}>{c.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <IconInput
                    icon="lock-closed-outline"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    testID="register-confirm-password-input"
                    colors={colors}
                  />
                  {confirmPassword.length > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
                      <Ionicons
                        name={passwordMatch ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={passwordMatch ? colors.success : colors.error}
                      />
                      <Text style={{ fontSize: 12, color: passwordMatch ? colors.success : colors.error, fontWeight: "700" }}>
                        {passwordMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
                      </Text>
                    </View>
                  )}

                  <IconInput
                    icon="gift-outline"
                    placeholder="Code de parrainage (optionnel)"
                    value={referralCode}
                    onChangeText={(v: string) => { setReferralCode(v.toUpperCase()); if (v.length >= 3) checkReferral(v.toUpperCase()); else setReferralCheck(null); }}
                    autoCapitalize="characters"
                    testID="register-referral-input"
                    colors={colors}
                  />
                  {referralCheck?.valid && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={{ fontSize: 12, color: colors.success, fontWeight: "700" }}>
                        Code valide ! +{referralCheck.reward}€ offerts par {referralCheck.sponsor_name}
                      </Text>
                    </View>
                  )}
                  {referralCheck?.valid === false && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
                      <Ionicons name="close-circle" size={14} color={colors.error} />
                      <Text style={{ fontSize: 12, color: colors.error, fontWeight: "700" }}>Code invalide</Text>
                    </View>
                  )}
                </View>

                {err && (
                  <View style={[s.errBox, { backgroundColor: colors.errorBg }]}>
                    <Ionicons name="alert-circle" size={15} color={colors.error} />
                    <Text style={[s.errTxt, { color: colors.error }]}>{err}</Text>
                  </View>
                )}

                {/* Checkbox CGU obligatoire */}
                <TouchableOpacity
                  style={s.checkRow}
                  onPress={() => setTermsAccepted(v => !v)}
                  activeOpacity={0.7}
                  testID="terms-checkbox"
                >
                  <View style={[s.checkbox, { borderColor: termsAccepted ? colors.primary : colors.border, backgroundColor: termsAccepted ? colors.primary : "transparent" }]}>
                    {termsAccepted && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={[s.checkText, { color: colors.textTertiary }]}>
                    {"J'accepte les "}
                    <Text
                      style={{ color: colors.primary, textDecorationLine: "underline" }}
                      onPress={() => Linking.openURL(CGU_URL)}
                    >{"Conditions Générales d'Utilisation"}</Text>
                    {" "}et la{" "}
                    <Text
                      style={{ color: colors.primary, textDecorationLine: "underline" }}
                      onPress={() => Linking.openURL(PRIVACY_URL)}
                    >Politique de confidentialité</Text>
                    {" "}*
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.submitBtn,
                    { backgroundColor: canSubmit ? colors.primary : colors.border },
                    canSubmit && shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 }),
                  ]}
                  onPress={onSubmit}
                  disabled={!canSubmit || !!oauthLoading}
                  testID="register-submit-btn"
                  activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={[s.submitTxt, { color: canSubmit ? colors.textInverse : colors.textTertiary }]}>Créer mon compte</Text>}
                </TouchableOpacity>

                <View style={s.footer}>
                  <Text style={[s.footerTxt, { color: colors.textSecondary }]}>Déjà un compte ? </Text>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity><Text style={[s.footerLink, { color: colors.primary }]}>Se connecter</Text></TouchableOpacity>
                  </Link>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  left: { width: 420, borderRightWidth: 1, position: "relative", overflow: "hidden", justifyContent: "space-between", padding: 40 },
  leftTop: {}, leftBottom: {},
  quote: { fontSize: 18, color: "rgba(255,255,255,0.9)", lineHeight: 28, fontWeight: "500" },
  quoteAuthor: { marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontWeight: "700" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoLetter: { color: "#fff", fontSize: 20, fontWeight: "800" },
  logoText: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingBottom: 40 },
  orb: { position: "absolute", width: 280, height: 280, borderRadius: 140, top: -80, right: -60, opacity: 0.3 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.xl },
  backTxt: { fontSize: 14, fontWeight: "600" },
  form: { maxWidth: 400, alignSelf: "center", width: "100%" },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6, marginTop: spacing.md },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: spacing.lg, lineHeight: 20 },
  oauthBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 10 },
  oauthTxt: { fontSize: 15, fontWeight: "600" },
  sepRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing.md },
  sepLine: { flex: 1, height: 1 },
  sepTxt: { fontSize: 12, fontWeight: "700" },
  helper: { fontSize: 12, marginBottom: 10 },
  inputs: { gap: 10, marginBottom: 12 },
  iconInput: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.md, height: 50, gap: 10 },
  iconInputText: { flex: 1, fontSize: 15, paddingRight: 14 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.sm, marginBottom: 10 },
  errTxt: { fontSize: 13, flex: 1 },
  submitBtn: { paddingVertical: 15, borderRadius: radius.md, alignItems: "center", marginBottom: spacing.md },
  submitTxt: { fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginBottom: spacing.md },
  footerTxt: { fontSize: 14 },
  footerLink: { fontWeight: "700", fontSize: 14 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkText: { fontSize: 12, lineHeight: 18, flex: 1 },
});
