import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, useAuth } from "../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

type DocType = "id_card" | "passport" | "driving_license";
type Step = "intro" | "doc" | "photo" | "selfie" | "review";

const DOC_LABELS: Record<DocType, { label: string; icon: any; helper: string }> = {
  id_card:        { label: "Carte d'identité",     icon: "card-outline",  helper: "Recto uniquement, lisible et sans reflet" },
  passport:       { label: "Passeport",            icon: "earth-outline", helper: "Page avec photo, bien à plat" },
  driving_license:{ label: "Permis de conduire",   icon: "car-outline",   helper: "Recto avec photo et signature" },
};

const REASON_MESSAGES: Record<string, { title: string; desc: string }> = {
  publish: { title: "Vérifiez votre identité pour publier", desc: "Pour protéger notre communauté contre les arnaques, tout propriétaire doit être vérifié avant de mettre un objet en location." },
  booking: { title: "Vérifiez votre identité pour réserver", desc: "Pour la sécurité des propriétaires, tout locataire doit être vérifié avant de réserver." },
  message: { title: "Vérifiez votre identité pour contacter", desc: "Contacter un propriétaire nécessite une identité vérifiée pour éviter le spam et les arnaques." },
  review:  { title: "Vérifiez votre identité pour laisser un avis", desc: "Les avis vérifiés inspirent confiance à toute la communauté." },
};

export default function VerificationScreen() {
  const router = useRouter();
  const { token, refreshUser } = useAuth();
  const colors = useColors();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const [docType, setDocType] = useState<DocType>("id_card");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("intro");

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/api/kyc/status", {}, token);
        setStatus(r.status || "none");
        if (r.status === "verified") setStep("review");
      } catch {}
    })();
  }, [token]);

  // Polling pour récup le passage en "verified"
  useEffect(() => {
    if (status !== "pending") return;
    const t = setInterval(async () => {
      try {
        const r = await apiFetch("/api/kyc/status", {}, token);
        setStatus(r.status || "none");
        if (r.status === "verified") {
          await refreshUser();
          Alert.alert("✓ Vérifié", "Votre identité est validée. Bienvenue !");
          setStep("review");
        }
      } catch {}
    }, 1500);
    return () => clearInterval(t);
  }, [status, token, refreshUser]);

  const pickImage = async (mode: "doc" | "selfie") => {
    if (Platform.OS !== "web") {
      const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm !== "granted") {
        Alert.alert("Permission refusée", "Accès aux photos requis.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
    if (mode === "doc") setImageBase64(b64); else setSelfieBase64(b64);
  };

  const submit = async () => {
    if (!imageBase64 || !selfieBase64) {
      Alert.alert("Erreur", "Ajoutez la photo du document ET un selfie.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/kyc/submit", {
        method: "POST",
        body: JSON.stringify({
          document_type: docType,
          document_image: imageBase64,
          selfie_image: selfieBase64,
        }),
      }, token);
      setStatus("pending");
      setStep("review");
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = status === "verified";
  const isPending = status === "pending";
  const reasonContent = reason && REASON_MESSAGES[reason as string] ? REASON_MESSAGES[reason as string] : null;

  // ─── RENDU PAR ÉTAPE ───────────────────────────
  const renderStep = () => {
    if (isVerified) {
      return (
        <Glass borderRadius={radius.lg} style={styles.bigCard}>
          <View style={[styles.successCircle, { backgroundColor: colors.successBg || "rgba(34,197,94,0.15)" }]}>
            <Ionicons name="shield-checkmark" size={56} color={colors.success} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.textPrimary }]}>Identité vérifiée ✓</Text>
          <Text style={[styles.bigSub, { color: colors.textSecondary }]}>
            Vous pouvez publier, réserver, contacter et laisser des avis en toute confiance.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>{"Retour à l'application"}</Text>
          </TouchableOpacity>
        </Glass>
      );
    }

    if (isPending) {
      return (
        <Glass borderRadius={radius.lg} style={styles.bigCard}>
          <View style={[styles.pendingCircle, { backgroundColor: colors.warningBg || colors.primaryTint }]}>
            <ActivityIndicator size="large" color={colors.warning || colors.primary} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.textPrimary }]}>Vérification en cours…</Text>
          <Text style={[styles.bigSub, { color: colors.textSecondary }]}>
            Nos équipes examinent vos documents. Vous serez notifié dans quelques instants (en mode démo : 3 secondes).
          </Text>
        </Glass>
      );
    }

    // Étape : intro
    if (step === "intro") {
      return (
        <>
          {reasonContent && (
            <Glass borderRadius={radius.lg} style={[styles.banner, { borderColor: colors.warning || colors.primary }]}>
              <Ionicons name="information-circle" size={22} color={colors.warning || colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>{reasonContent.title}</Text>
                <Text style={[styles.bannerText, { color: colors.textSecondary }]}>{reasonContent.desc}</Text>
              </View>
            </Glass>
          )}

          <Glass borderRadius={radius.lg} style={styles.section}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primaryTint }]}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Vérifiez votre identité en 3 étapes</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              {"Conformément à la loi française et pour protéger la communauté contre les arnaques, nous vérifions l'identité de chaque utilisateur."}
            </Text>
          </Glass>

          <View style={{ gap: 10 }}>
            {[
              { n: 1, ico: "card-outline",    t: "Choisissez votre pièce", d: "Carte d'identité, passeport ou permis de conduire — au choix." },
              { n: 2, ico: "camera-outline",  t: "Photographiez le document", d: "Prenez une photo nette, sans reflet, lisible." },
              { n: 3, ico: "person-outline",  t: "Faites un selfie", d: "Pour confirmer que vous êtes bien la personne sur le document." },
            ].map((s) => (
              <Glass key={s.n} borderRadius={radius.md} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNumText, { color: colors.textInverse }]}>{s.n}</Text>
                </View>
                <View style={[styles.stepIco, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name={s.ico as any} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{s.t}</Text>
                  <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{s.d}</Text>
                </View>
              </Glass>
            ))}
          </View>

          <Glass borderRadius={radius.lg} style={styles.section}>
            <Text style={[styles.smallTitle, { color: colors.textPrimary }]}>🔒 Vos données sont protégées</Text>
            {[
              "Chiffrement de bout en bout (AES-256)",
              "Stockage sécurisé conforme RGPD",
              "Données utilisées uniquement pour la vérification — jamais partagées",
              "Suppression possible à tout moment depuis vos paramètres",
            ].map((t, i) => (
              <View key={i} style={styles.privacyRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                <Text style={[styles.privacyText, { color: colors.textSecondary }]}>{t}</Text>
              </View>
            ))}
          </Glass>

          <TouchableOpacity
            onPress={() => setStep("doc")}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Commencer la vérification</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        </>
      );
    }

    // Étape : choix du document
    if (step === "doc") {
      return (
        <>
          <Text style={[styles.stepHeader, { color: colors.textPrimary }]}>Étape 1/3 · Type de document</Text>
          <Text style={[styles.stepSubHeader, { color: colors.textSecondary }]}>
            {"Choisissez la pièce d'identité officielle française que vous allez photographier."}
          </Text>

          <View style={{ gap: 10, marginTop: 16 }}>
            {(Object.entries(DOC_LABELS) as [DocType, typeof DOC_LABELS[DocType]][]).map(([key, info]) => {
              const selected = docType === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setDocType(key)}
                  activeOpacity={0.8}
                >
                  <Glass borderRadius={radius.lg} style={[
                    styles.docOption,
                    selected && { borderColor: colors.primary, borderWidth: 2 },
                  ]}>
                    <View style={[styles.docIco, { backgroundColor: selected ? colors.primary : colors.surface2 }]}>
                      <Ionicons name={info.icon} size={24} color={selected ? colors.textInverse : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{info.label}</Text>
                      <Text style={[styles.docHelper, { color: colors.textSecondary }]}>{info.helper}</Text>
                    </View>
                    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}>
                      {selected && <Ionicons name="checkmark" size={13} color={colors.textInverse} />}
                    </View>
                  </Glass>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => setStep("intro")} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStep("photo")}
              style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Continuer</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Étape : photo document
    if (step === "photo") {
      return (
        <>
          <Text style={[styles.stepHeader, { color: colors.textPrimary }]}>Étape 2/3 · Photo du document</Text>
          <Text style={[styles.stepSubHeader, { color: colors.textSecondary }]}>
            {DOC_LABELS[docType].helper}.
          </Text>

          <Glass borderRadius={radius.lg} style={styles.tipsBox}>
            <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>📸 Conseils pour une photo réussie</Text>
            {[
              "Posez le document à plat sur une surface uniforme",
              "Éclairage naturel, sans reflet ni ombre",
              "Tout le document doit être visible (4 coins)",
              "Texte net et lisible",
            ].map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark" size={14} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>{t}</Text>
              </View>
            ))}
          </Glass>

          <TouchableOpacity
            onPress={() => pickImage("doc")}
            disabled={isPending}
            style={[
              styles.uploader,
              { borderColor: imageBase64 ? colors.primary : colors.border, backgroundColor: colors.surface2 },
            ]}
          >
            {imageBase64 ? (
              <>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={[styles.uploaderText, { color: colors.success }]}>Document ajouté</Text>
                <Text style={[styles.uploaderHint, { color: colors.textSecondary }]}>Toucher pour remplacer</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
                <Text style={[styles.uploaderText, { color: colors.textPrimary }]}>Choisir une photo</Text>
                <Text style={[styles.uploaderHint, { color: colors.textSecondary }]}>JPG ou PNG, max 5 Mo</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => setStep("doc")} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStep("selfie")}
              disabled={!imageBase64}
              style={[
                styles.primaryBtn,
                { flex: 1, backgroundColor: imageBase64 ? colors.primary : colors.border },
                imageBase64 && shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: imageBase64 ? colors.textInverse : colors.textTertiary }]}>Continuer</Text>
              <Ionicons name="arrow-forward" size={18} color={imageBase64 ? colors.textInverse : colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Étape : selfie
    if (step === "selfie") {
      return (
        <>
          <Text style={[styles.stepHeader, { color: colors.textPrimary }]}>Étape 3/3 · Selfie de confirmation</Text>
          <Text style={[styles.stepSubHeader, { color: colors.textSecondary }]}>
            Cela confirme que vous êtes bien la personne sur le document.
          </Text>

          <Glass borderRadius={radius.lg} style={styles.tipsBox}>
            <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>🤳 Conseils pour le selfie</Text>
            {[
              "Visage entier visible, sans casquette ni lunettes de soleil",
              "Bonne lumière, regard caméra",
              "Expression neutre",
              "Vous serez le seul à voir cette photo",
            ].map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark" size={14} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>{t}</Text>
              </View>
            ))}
          </Glass>

          <TouchableOpacity
            onPress={() => pickImage("selfie")}
            disabled={isPending}
            style={[
              styles.uploader,
              { borderColor: selfieBase64 ? colors.primary : colors.border, backgroundColor: colors.surface2 },
            ]}
          >
            {selfieBase64 ? (
              <>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={[styles.uploaderText, { color: colors.success }]}>Selfie ajouté</Text>
                <Text style={[styles.uploaderHint, { color: colors.textSecondary }]}>Toucher pour remplacer</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-circle-outline" size={48} color={colors.primary} />
                <Text style={[styles.uploaderText, { color: colors.textPrimary }]}>Prendre / choisir un selfie</Text>
                <Text style={[styles.uploaderHint, { color: colors.textSecondary }]}>JPG ou PNG, max 5 Mo</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => setStep("photo")} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={!selfieBase64 || submitting}
              style={[
                styles.primaryBtn,
                { flex: 1, backgroundColor: selfieBase64 ? colors.primary : colors.border },
                selfieBase64 && shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 }),
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Text style={[styles.primaryBtnText, { color: selfieBase64 ? colors.textInverse : colors.textTertiary }]}>Envoyer pour vérification</Text>
                  <Ionicons name="checkmark" size={18} color={selfieBase64 ? colors.textInverse : colors.textTertiary} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{"Vérification d'identité"}</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Indicateur de progression */}
          {!isVerified && !isPending && step !== "intro" && (
            <View style={styles.progressBar}>
              {["doc", "photo", "selfie"].map((s, i) => {
                const currentIdx = ["doc", "photo", "selfie"].indexOf(step);
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor: done || active ? colors.primary : colors.border,
                        flex: 1, height: 3, borderRadius: 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 60 }}>
            {renderStep()}
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
  progressBar: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  progressDot: {},

  // Big cards (verified/pending)
  bigCard: { padding: spacing.xl, alignItems: "center", gap: 12 },
  successCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  pendingCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  bigTitle: { fontSize: 22, fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  bigSub: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: spacing.sm },

  // Reason banner
  banner: { flexDirection: "row", padding: spacing.md, gap: spacing.sm, borderWidth: 1, alignItems: "flex-start" },
  bannerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  bannerText: { fontSize: 12, lineHeight: 16 },

  // Section / hero
  section: { padding: spacing.lg, alignItems: "center", gap: 6 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  heroTitle: { fontSize: 18, fontWeight: "900", textAlign: "center", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, lineHeight: 19, textAlign: "center" },

  // Steps
  stepRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 13, fontWeight: "900" },
  stepIco: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 14, fontWeight: "800" },
  stepDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },

  // Privacy
  smallTitle: { fontSize: 14, fontWeight: "800", marginBottom: 8, alignSelf: "flex-start" },
  privacyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, alignSelf: "stretch", paddingVertical: 3 },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Step screens
  stepHeader: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  stepSubHeader: { fontSize: 18, fontWeight: "800", marginTop: 4, lineHeight: 24, letterSpacing: -0.3 },

  // Document option (signup)
  docOption: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  docIco: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  docTitle: { fontSize: 14, fontWeight: "800" },
  docHelper: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },

  // Tips
  tipsBox: { padding: spacing.md, gap: 6, marginTop: 8 },
  tipsTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Uploader
  uploader: { borderWidth: 2, borderStyle: "dashed", borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: 6, marginTop: 12 },
  uploaderText: { fontSize: 15, fontWeight: "800", marginTop: 6 },
  uploaderHint: { fontSize: 12 },

  // Buttons
  navRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, paddingHorizontal: 24, borderRadius: radius.md, marginTop: spacing.md },
  primaryBtnText: { fontSize: 15, fontWeight: "800" },
  secondaryBtn: { paddingVertical: 15, paddingHorizontal: 24, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
});
