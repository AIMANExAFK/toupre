import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { useAuth, BACKEND_URL } from "../../src/auth";
import { FranceConnectLogo } from "../../src/FranceConnectLogo";
import { PasskeyManager } from "../../src/NotificationsManager";

export default function IdentifyHub() {
  const router = useRouter();
  const colors = useColors();
  const { refreshUser } = useAuth();
  const [fcLoading, setFcLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const hasWebAuthn = PasskeyManager.isSupported();
  const [passkeyEmail] = useState("");

  const onFranceConnect = async () => {
    setFcLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/franceconnect/start`, { method: "POST" });
      const data = await r.json();
      router.push(`/auth/franceconnect-callback?state=${data.state}`);
    } catch {
      setFcLoading(false);
    }
  };

  const onPasskey = async () => {
    // Demande l'email d'abord pour identifier le compte
    const email = passkeyEmail.trim() || prompt("Email associé à votre passkey :", "");
    if (!email) return;
    setBioLoading(true);
    try {
      // 1. Récupère le challenge pour cet email
      const r = await fetch(`${BACKEND_URL}/api/auth/passkey/auth/begin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) {
        const err = await r.json();
        alert(err.detail || "Aucune passkey enregistrée pour ce compte. Connectez-vous classiquement et activez la biométrie dans Sécurité.");
        return;
      }
      const begin = await r.json();

      // 2. navigator.credentials.get → déclenche Touch ID / Face ID
      const credential = await PasskeyManager.authenticate({
        challenge: begin.challenge,
        allowCredentials: begin.allowCredentials,
        rpId: begin.rpId || window.location.hostname,
      });

      if (!credential) {
        alert("Authentification annulée.");
        return;
      }

      // 3. Envoie la signature au serveur pour validation
      const finish = await fetch(`${BACKEND_URL}/api/auth/passkey/auth/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential_id: credential.credentialId,
          client_data_json: credential.clientDataJSON,
          authenticator_data: credential.authenticatorData,
          signature: credential.signature,
          device_name: typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0] + ")" : "Web",
        }),
      });
      if (!finish.ok) {
        const err = await finish.json();
        alert(err.detail || "Vérification échouée.");
        return;
      }
      const data = await finish.json();
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ls_token", data.access_token);
        localStorage.setItem("ls_user", JSON.stringify(data.user));
      }
      await refreshUser();
      router.replace("/(tabs)");
    } catch (e: any) {
      alert(e?.message || "Erreur biométrie");
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Identification</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>

            {/* Hero */}
            <View style={{ alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.sm }}>
              <View style={[styles.heroIco, { backgroundColor: colors.primaryTint }]}>
                <Ionicons name="finger-print" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Identifiez-vous</Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Choisissez la méthode la plus adaptée. Plus la méthode est forte, plus votre profil est crédible.
              </Text>
            </View>

            {/* ─── 1. FRANCE CONNECT (recommandé) ─── */}
            <TouchableOpacity onPress={onFranceConnect} disabled={fcLoading} activeOpacity={0.85} testID="auth-france-connect">
              <View style={[styles.methodCard, styles.fcCard, shadowStyle({ color: "#000091", opacity: 0.25, radius: 14, offsetY: 5 })]}>
                <View style={styles.fcBadge}>
                  <Text style={styles.fcBadgeText}>RECOMMANDÉ — KYC AUTOMATIQUE</Text>
                </View>
                <View style={styles.methodHead}>
                  <View style={styles.fcLogoWrap}>
                    <FranceConnectLogo size="medium" />
                  </View>
                  {fcLoading && <ActivityIndicator color="#fff" />}
                </View>
                <Text style={styles.fcTitle}>Identifiez-vous avec FranceConnect</Text>
                <Text style={styles.fcDesc}>
                  {"Connectez-vous avec votre compte impots.gouv.fr, Ameli, MSA, La Poste ou autre. Votre identité est "}
                  <Text style={{ fontWeight: "900" }}>automatiquement vérifiée</Text>
                  {" — pas de pièce d'identité à fournir."}
                </Text>
                <View style={styles.fcRow}>
                  <View style={styles.fcCheck}><Ionicons name="checkmark" size={11} color="#000091" /></View>
                  <Text style={styles.fcCheckText}>KYC instantané · Aucune photo à envoyer</Text>
                </View>
                <View style={styles.fcRow}>
                  <View style={styles.fcCheck}><Ionicons name="checkmark" size={11} color="#000091" /></View>
                  <Text style={styles.fcCheckText}>{"Service officiel de l'État français"}</Text>
                </View>
                <View style={styles.fcRow}>
                  <View style={styles.fcCheck}><Ionicons name="checkmark" size={11} color="#000091" /></View>
                  <Text style={styles.fcCheckText}>{"Vos données restent chez votre fournisseur d'identité"}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Autres méthodes</Text>

            {/* ─── 2. MAGIC LINK / OTP ─── */}
            <TouchableOpacity onPress={() => router.push("/auth/otp")} activeOpacity={0.85} testID="auth-otp">
              <Glass borderRadius={radius.lg} style={styles.methodCard}>
                <View style={[styles.methodIco, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="mail-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>Code par email</Text>
                  <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                    Recevez un code à 6 chiffres. Sans mot de passe, plus simple et plus sûr.
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { backgroundColor: colors.successBg || "rgba(34,197,94,0.15)" }]}>
                      <Text style={[styles.tagText, { color: colors.success }]}>SANS MOT DE PASSE</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Glass>
            </TouchableOpacity>

            {/* ─── 3. PASSKEY / BIOMÉTRIE ─── */}
            <TouchableOpacity onPress={onPasskey} disabled={bioLoading} activeOpacity={0.85} testID="auth-passkey">
              <Glass borderRadius={radius.lg} style={[styles.methodCard, !hasWebAuthn && { opacity: 0.5 }]}>
                <View style={[styles.methodIco, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="finger-print" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                    Biométrie / Passkey
                  </Text>
                  <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                    {hasWebAuthn
                      ? "Connectez-vous avec Touch ID, Face ID ou Windows Hello."
                      : "Non disponible sur cet appareil."}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { backgroundColor: colors.primaryTint }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>LE PLUS SÉCURISÉ</Text>
                    </View>
                  </View>
                </View>
                {bioLoading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              </Glass>
            </TouchableOpacity>

            {/* ─── 4. EMAIL / MOT DE PASSE (classique) ─── */}
            <TouchableOpacity onPress={() => router.push("/(auth)/login")} activeOpacity={0.85} testID="auth-classic">
              <Glass borderRadius={radius.lg} style={styles.methodCard}>
                <View style={[styles.methodIco, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="lock-closed-outline" size={22} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>Email + mot de passe</Text>
                  <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                    {"Méthode classique. Nécessitera la vérification d'identité après inscription."}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Glass>
            </TouchableOpacity>

            {/* Footer info */}
            <View style={[styles.disclaimer, { backgroundColor: colors.surface2 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                Quelle que soit la méthode, vos données sont chiffrées et nous ne partageons rien sans votre consentement. Conformité RGPD.
              </Text>
            </View>

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
  heroTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, paddingHorizontal: spacing.sm },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginTop: spacing.sm, marginBottom: 2 },

  // Method card
  methodCard: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 12, borderRadius: radius.lg },
  methodIco: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  methodTitle: { fontSize: 14, fontWeight: "800" },
  methodDesc: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },

  // France Connect card (color française : #000091 bleu officiel)
  fcCard: {
    backgroundColor: "#000091",
    padding: spacing.lg,
    flexDirection: "column",
    alignItems: "stretch",
    borderRadius: radius.lg,
    borderWidth: 0,
  },
  fcBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFD700",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 12,
  },
  fcBadgeText: { fontSize: 10, fontWeight: "900", color: "#000091", letterSpacing: 0.5 },
  fcLogoWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  fcTitle: { color: "#fff", fontSize: 17, fontWeight: "900", marginTop: 14, marginBottom: 6 },
  fcDesc: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 19, marginBottom: 14 },
  fcRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  fcCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  fcCheckText: { color: "#fff", fontSize: 12, fontWeight: "600", flex: 1 },

  // Disclaimer
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: radius.sm, marginTop: spacing.md },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
