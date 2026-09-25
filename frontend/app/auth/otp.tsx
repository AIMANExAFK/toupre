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
  Animated,
  Easing,
  AccessibilityInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useTheme, spacing, radius, shadowStyle } from "../../src/theme";
import { useAuth } from "../../src/auth";
import { BRAND_TAGLINE } from "../../src/Brand";

// Bouton tactile animable : permet un léger enfoncement à l'appui.
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Ces champs dessinent eux-mêmes leur focus (bordure sombre) : on retire le
// contour générique du navigateur pour éviter un double anneau (voir +html.tsx).
const FOCUS_PROPRE = { dataSet: { focusPropre: "1" } } as any;

// Écran de connexion, dans l'esprit des écrans de connexion « cartes » :
// un écran d'ouverture sombre plein cadre qui remonte et se creuse en vague
// pour devenir l'en-tête, puis le formulaire qui apparaît élément par élément.
//
// Géométrie du bandeau sombre : il s'arrête à HAUT_BANDEAU côté droit, et sa
// courbe descend de CREUX points de plus côté gauche.
const HAUT_BANDEAU = 132;
const CREUX = 96;
const MARGE = 24;

type Step = "contact" | "code";

export default function OtpFlow() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>("contact");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [focus, setFocus] = useState<"email" | "phone" | null>(null);
  const [caseActive, setCaseActive] = useState<number | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Encre du bandeau : l'anthracite de la marque plutôt qu'un noir pur. En mode
  // sombre, un ton plus CLAIR que le fond : plus profond, il se confondait avec
  // lui et la vague — tout l'intérêt de l'écran — disparaissait.
  const encre = isDark ? "#3A2B24" : "#2B2420";
  // Bouton pilule : sombre sur crème ; inversé (clair sur sombre) en mode sombre.
  const pilule = isDark ? colors.textPrimary : encre;
  const texteSurPilule = isDark ? colors.textInverse : "#FFFFFF";

  // ── Mesures : l'animation d'ouverture part du plein écran ─────────────────
  const [cadre, setCadre] = useState({ w: 0, h: 0 });
  const [largeurTitre, setLargeurTitre] = useState(0);
  const hautBandeau = insets.top + HAUT_BANDEAU;
  const hautTitre = insets.top + 62;

  // ── Animations ────────────────────────────────────────────────────────────
  // Ouverture : 0 → 1 fait apparaître le nom et la signature au centre.
  const ouverture = useRef(new Animated.Value(0)).current;
  // Vague : 0 = plein écran, 1 = bandeau d'en-tête.
  const vague = useRef(new Animated.Value(0)).current;
  // Formulaire : 0 → 1 fait entrer ses éléments l'un après l'autre.
  const formulaire = useRef(new Animated.Value(0)).current;
  const demarre = useRef(false);

  // Entrée de chaque étape : fondu + glissé horizontal dans le sens de la
  // navigation — « code » entre par la droite, le retour par la gauche.
  const enter = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);
  // Secousse latérale quand une saisie est refusée.
  const shake = useRef(new Animated.Value(0)).current;
  // Rebond de chaque case de code au moment où elle se remplit.
  const pop = useRef([...Array(6)].map(() => new Animated.Value(1))).current;
  // Enfoncement du bouton principal à l'appui.
  const btnScale = useRef(new Animated.Value(1)).current;

  // La séquence d'ouverture démarre une fois l'écran mesuré. Si l'utilisateur
  // a demandé de réduire les animations, on arrive directement sur le formulaire.
  useEffect(() => {
    if (cadre.h === 0 || demarre.current) return;
    demarre.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduire) => {
        if (reduire) {
          ouverture.setValue(1);
          vague.setValue(1);
          formulaire.setValue(1);
          return;
        }
        Animated.sequence([
          Animated.timing(ouverture, {
            toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false,
          }),
          Animated.delay(350),
          Animated.timing(vague, {
            toValue: 1, duration: 820, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: false,
          }),
          Animated.timing(formulaire, {
            toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: false,
          }),
        ]).start();
      });
  }, [cadre.h]);

  // Chaque élément du formulaire entre à son tour : fenêtre décalée de 12 %.
  const apparition = (i: number) => {
    const debut = i * 0.12;
    const fin = Math.min(debut + 0.5, 1);
    return {
      opacity: formulaire.interpolate({ inputRange: [debut, fin], outputRange: [0, 1], extrapolate: "clamp" }),
      transform: [{
        translateY: formulaire.interpolate({ inputRange: [debut, fin], outputRange: [16, 0], extrapolate: "clamp" }),
      }],
    };
  };

  // Le nom part du centre de l'écran et file en haut à gauche.
  const departX = cadre.w && largeurTitre ? (cadre.w - largeurTitre) / 2 - MARGE : 0;
  const departY = cadre.h ? cadre.h / 2 - 22 - hautTitre : 0;
  const styleTitre = {
    opacity: ouverture,
    transform: [
      { translateX: vague.interpolate({ inputRange: [0, 1], outputRange: [departX, 0] }) },
      { translateY: vague.interpolate({ inputRange: [0, 1], outputRange: [departY, 0] }) },
    ],
  };
  // La signature s'efface pendant la montée, le message d'accueil la remplace.
  const opaciteSignature = Animated.multiply(
    ouverture,
    vague.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: "clamp" }),
  );
  const opaciteAccueil = vague.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: "clamp" });

  const hauteurVague = cadre.h
    ? vague.interpolate({ inputRange: [0, 1], outputRange: [cadre.h + CREUX, hautBandeau] })
    : undefined;

  const jouerEntree = () => {
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  };

  // Rejoue l'entrée à chaque changement d'étape — pas au premier rendu, que la
  // séquence d'ouverture prend déjà en charge.
  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    jouerEntree();
  }, [step]);

  // Secousse à l'apparition d'une erreur : le formulaire « refuse » visiblement.
  useEffect(() => {
    if (!error) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -0.6, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [error]);

  const popCase = (i: number) => {
    pop[i].setValue(1);
    Animated.sequence([
      Animated.spring(pop[i], { toValue: 1.18, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(pop[i], { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
    ]).start();
  };

  const enfoncer = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const relacher = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const styleEntree = {
    opacity: enter,
    transform: [{
      translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [34 * dir.current, 0] }),
    }],
  };
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });

  const allerCode = () => { dir.current = 1; setStep("code"); };
  const revenirContact = () => { dir.current = -1; setStep("contact"); };

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PHONE_REGEX = /^(\+?\d[\d\s.-]{7,14})$/;
  const emailValid = EMAIL_REGEX.test(email.trim());
  const phoneValid = PHONE_REGEX.test(phone.trim());
  const contactValid = emailValid && phoneValid;
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
    if (!phoneValid) { setError("Numéro de téléphone invalide"); return; }
    setLoading(true); setError(null);
    try {
      const data = await requestOtp(email.trim().toLowerCase(), phone.trim());
      allerCode();
      setResendIn(30);
      setDevCode(data.devCode || null);
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
      await verifyOtp(email.trim().toLowerCase(), phone.trim(), codeStr);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Code incorrect");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onDigitChange = (idx: number, value: string) => {
    // Permet aussi le collage du code complet
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...code];
      digits.forEach((d, i) => { if (idx + i < 6) { next[idx + i] = d; popCase(idx + i); } });
      setCode(next);
      const last = Math.min(idx + digits.length, 5);
      inputs.current[last]?.focus();
      if (next.join("").length === 6) setTimeout(verifyOTP, 100);
      return;
    }
    const next = [...code];
    const chiffre = value.replace(/\D/g, "");
    next[idx] = chiffre;
    setCode(next);
    if (chiffre) popCase(idx);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === "Backspace" && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  // Bordure d'un champ : invisible au repos, sombre au focus — la saisie en
  // cours se lit sans couleur supplémentaire.
  const bordure = (actif: boolean) => (actif ? (isDark ? colors.textPrimary : encre) : "transparent");

  const bouton = (
    valide: boolean,
    onPress: () => void,
    libelle: string,
    testID: string,
    icone?: keyof typeof Ionicons.glyphMap,
  ) => (
    <AnimatedTouchable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={enfoncer}
      onPressOut={relacher}
      disabled={!valide || loading}
      accessibilityState={{ disabled: !valide || loading }}
      style={[
        styles.pilule,
        { backgroundColor: valide ? pilule : colors.border, transform: [{ scale: btnScale }] },
        valide && shadowStyle({ color: encre, opacity: 0.28, radius: 18, offsetY: 8 }),
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={texteSurPilule} />
      ) : (
        <>
          <Text style={[styles.piluleTxt, { color: valide ? texteSurPilule : colors.textTertiary }]}>{libelle}</Text>
          {icone && <Ionicons name={icone} size={17} color={valide ? texteSurPilule : colors.textTertiary} />}
        </>
      )}
    </AnimatedTouchable>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== cadre.w || height !== cadre.h) setCadre({ w: width, h: height });
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: hautBandeau + CREUX - 4,
          paddingHorizontal: MARGE,
          paddingBottom: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "contact" ? (
          <Animated.View style={[styles.etape, styleEntree]}>
            <Animated.View style={apparition(0)}>
              <Text style={[styles.titre, { color: colors.textPrimary }]}>Connexion</Text>
            </Animated.View>

            <Animated.View style={[{ gap: spacing.md }, { transform: [{ translateX: shakeX }] }]}>
              <Animated.View style={apparition(1)}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Adresse email</Text>
                <View style={[styles.champ, { backgroundColor: colors.surface, borderColor: bordure(focus === "email") }]}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocus("email")}
                    onBlur={() => setFocus(null)}
                    placeholder="vous@exemple.com"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={[styles.input, { color: colors.textPrimary }]}
                    autoFocus
                    onSubmitEditing={requestOTP}
                    testID="otp-email-input"
                    {...FOCUS_PROPRE}
                  />
                  {emailValid && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                </View>
              </Animated.View>

              <Animated.View style={apparition(2)}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Numéro de téléphone</Text>
                <View style={[styles.champ, { backgroundColor: colors.surface, borderColor: bordure(focus === "phone") }]}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setFocus("phone")}
                    onBlur={() => setFocus(null)}
                    placeholder="06 12 34 56 78"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    style={[styles.input, { color: colors.textPrimary }]}
                    onSubmitEditing={requestOTP}
                    testID="otp-phone-input"
                    {...FOCUS_PROPRE}
                  />
                  {phoneValid && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                </View>
              </Animated.View>
            </Animated.View>

            {error && (
              <View style={[styles.errBox, { backgroundColor: colors.errorBg }]}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            <Animated.View style={apparition(3)}>
              {bouton(contactValid, requestOTP, "Recevoir mon code", "otp-send-btn", "arrow-forward")}
            </Animated.View>

            <Animated.View style={[styles.pied, apparition(4)]}>
              <View style={[styles.trait, { backgroundColor: colors.border }]} />
              <Text style={[styles.piedTxt, { color: colors.textSecondary }]}>
                Pas encore de compte ?{" "}
                <Text style={{ color: colors.textPrimary, fontWeight: "800" }}>Le même code vous inscrit.</Text>
              </Text>
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.etape, styleEntree]}>
            <View>
              <Text style={[styles.titre, { color: colors.textPrimary }]}>Saisissez le code</Text>
              <Text style={[styles.sousTitre, { color: colors.textSecondary }]}>
                Envoyé à <Text style={{ fontWeight: "800", color: colors.textPrimary }}>{email}</Text>
                {" "}et <Text style={{ fontWeight: "800", color: colors.textPrimary }}>{phone}</Text>
              </Text>
            </View>

            {devCode && (
              <View style={[styles.devBanner, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="construct-outline" size={16} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.devTitle, { color: colors.textPrimary }]}>Mode démo</Text>
                  <Text style={[styles.devText, { color: colors.textSecondary }]}>
                    Votre code : <Text style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontWeight: "900", fontSize: 16, color: colors.warning }}>{devCode}</Text>
                  </Text>
                </View>
              </View>
            )}

            <Animated.View style={[styles.codeRow, { transform: [{ translateX: shakeX }] }]}>
              {code.map((c, i) => (
                <Animated.View key={i} style={{ transform: [{ scale: pop[i] }] }}>
                  <TextInput
                    ref={(r) => {
                      inputs.current[i] = r;
                    }}
                    value={c}
                    onChangeText={(v) => onDigitChange(i, v)}
                    onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                    onFocus={() => setCaseActive(i)}
                    onBlur={() => setCaseActive((a) => (a === i ? null : a))}
                    keyboardType="number-pad"
                    maxLength={1}
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: colors.surface,
                        color: colors.textPrimary,
                        borderColor: c || caseActive === i ? (isDark ? colors.textPrimary : encre) : "transparent",
                      },
                    ]}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    testID={`otp-digit-${i}`}
                    {...FOCUS_PROPRE}
                  />
                </Animated.View>
              ))}
            </Animated.View>

            {error && (
              <View style={[styles.errBox, { backgroundColor: colors.errorBg }]}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {bouton(codeValid, verifyOTP, "Vérifier le code", "otp-verify-btn")}

            <View style={styles.resendRow}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Pas reçu de code ? </Text>
              {resendIn > 0 ? (
                <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: "700" }}>
                  Renvoyer dans {resendIn}s
                </Text>
              ) : (
                <TouchableOpacity accessibilityRole="button" onPress={requestOTP}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "800" }}>Renvoyer</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bandeau sombre. Plein écran à l'ouverture, il remonte jusqu'à devenir
          l'en-tête ; sa courbe basse le suit. Il laisse passer les touchers. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bandeau,
          { backgroundColor: encre },
          hauteurVague ? { height: hauteurVague } : { bottom: 0 },
        ]}
      >
        <Svg
          width="100%"
          height={CREUX}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={styles.courbe}
        >
          <Path d="M0 0 H100 V0 Q60 95 0 100 Z" fill={encre} />
        </Svg>
      </Animated.View>

      {/* Nom et messages : centrés à l'ouverture, en haut à gauche ensuite. */}
      <Animated.View pointerEvents="none" style={[styles.titreBloc, { top: hautTitre }, styleTitre]}>
        <Text
          style={styles.marque}
          onLayout={(e) => setLargeurTitre(e.nativeEvent.layout.width)}
        >
          TOUPRÉ
        </Text>
        <Animated.Text style={[styles.signature, { opacity: opaciteSignature }]}>
          {BRAND_TAGLINE}
        </Animated.Text>
        <Animated.Text
          style={[styles.accueil, { opacity: opaciteAccueil, width: Math.max(cadre.w - 2 * MARGE, 200) }]}
        >
          {step === "contact"
            ? "Bon retour ! Connectez-vous pour continuer."
            : "Plus qu’une étape : le code reçu."}
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.retour, { top: insets.top + 10, opacity: vague }]}>
        <TouchableOpacity
          accessibilityLabel="Retour"
          accessibilityRole="button"
          onPress={() => (step === "code" ? revenirContact() : router.back())}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: { position: "absolute", top: 0, left: 0, right: 0, overflow: "visible" },
  courbe: { position: "absolute", left: 0, right: 0, bottom: -CREUX + 1 },

  titreBloc: { position: "absolute", left: MARGE, alignSelf: "flex-start" },
  marque: { color: "#FFFFFF", fontSize: 26, fontWeight: "600", letterSpacing: 8 },
  // Centrée sur le nom quelle que soit sa longueur, sans retour à la ligne.
  signature: {
    position: "absolute", top: 40, left: -200, right: -200,
    textAlign: "center", color: "rgba(255,255,255,0.62)", fontSize: 13,
  },
  accueil: { position: "absolute", top: 40, left: 0, color: "rgba(255,255,255,0.72)", fontSize: 13.5 },

  retour: { position: "absolute", left: MARGE - 8 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  etape: { gap: spacing.md },
  titre: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  sousTitre: { fontSize: 14, lineHeight: 20, marginTop: 6 },

  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  champ: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderRadius: 14, minHeight: 54, paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },

  errBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.sm },

  pilule: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 56, borderRadius: 999, marginTop: spacing.sm,
  },
  piluleTxt: { fontSize: 16, fontWeight: "800" },

  pied: { alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  trait: { width: 48, height: 1 },
  piedTxt: { fontSize: 13, textAlign: "center" },

  // Code boxes
  codeRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: spacing.sm },
  codeBox: {
    width: 46, height: 56,
    borderWidth: 1.5, borderRadius: 12,
    textAlign: "center",
    fontSize: 26, fontWeight: "900",
    letterSpacing: -0.5,
  },

  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.sm },

  // Dev banner
  devBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14 },
  devTitle: { fontSize: 12, fontWeight: "800" },
  devText: { fontSize: 13, marginTop: 1 },
});
