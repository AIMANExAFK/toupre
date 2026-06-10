import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import type { TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "../../src/theme";
import { BACKEND_URL, useAuth } from "../../src/auth";
import { FranceConnectLogo } from "../../src/FranceConnectLogo";

// Simule le portail officiel FranceConnect : choix du fournisseur d'identité
// puis confirmation des données (en vrai c'est sur le site du gouv)
const PROVIDERS = [
  { id: "impots",  name: "impots.gouv.fr", color: "#005FAB", icon: "calculator-outline" },
  { id: "ameli",   name: "Ameli",          color: "#0078C6", icon: "medical-outline" },
  { id: "laposte", name: "L'Identité Numérique La Poste", color: "#FCD200", icon: "mail-outline" },
  { id: "msa",     name: "MSA",            color: "#00833B", icon: "leaf-outline" },
  { id: "yris",    name: "Yris",           color: "#7C3AED", icon: "shield-outline" },
];

type Phase = "choose" | "auth" | "confirm" | "finalize";

export default function FranceConnectCallback() {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state: string }>();
  const { refreshUser } = useAuth();

  const [phase, setPhase] = useState<Phase>("choose");
  const [provider, setProvider] = useState<typeof PROVIDERS[0] | null>(null);
  const [identity, setIdentity] = useState({
    given_name: "Jean",
    family_name: "Dupont",
    email: "jean.dupont@example.fr",
    birthdate: "1990-05-15",
  });
  const [error, setError] = useState<string | null>(null);

  const finalize = async () => {
    setPhase("finalize");
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/franceconnect/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, identity }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "Erreur"); return; }
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.setItem("ls_token", data.access_token);
        localStorage.setItem("ls_user", JSON.stringify(data.user));
      }
      await refreshUser();
      // Petite pause pour montrer le succès
      setTimeout(() => router.replace("/(tabs)"), 1500);
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    }
  };

  // Auto-progression : choose → auth (simulé 1.5s) → confirm
  useEffect(() => {
    if (phase === "auth") {
      const t = setTimeout(() => setPhase("confirm"), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <View style={[styles.root, { backgroundColor: "#000091" }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* Header officiel FC */}
        <View style={styles.header}>
          <View style={styles.fcLogoWrap}>
            <FranceConnectLogo size="small" />
          </View>
          {phase !== "finalize" && (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.cancel}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.body}>

          {/* ─── ÉTAPE 1 : Choix du fournisseur ─── */}
          {phase === "choose" && (
            <>
              <Text style={styles.title}>Choisissez un compte pour vous connecter à LocaShare</Text>
              <Text style={styles.sub}>{"FranceConnect est le service public officiel d'identification."}</Text>

              <View style={{ marginTop: 24, gap: 10 }}>
                {PROVIDERS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => { setProvider(p); setPhase("auth"); }}
                    activeOpacity={0.8}
                    style={styles.provBtn}
                    testID={`fc-prov-${p.id}`}
                  >
                    <View style={[styles.provIco, { backgroundColor: p.color + "22" }]}>
                      <Ionicons name={p.icon as any} size={20} color={p.color} />
                    </View>
                    <Text style={styles.provName}>{p.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ─── ÉTAPE 2 : Auth (loader) ─── */}
          {phase === "auth" && (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <View style={styles.loadCircle}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
              <Text style={styles.title}>Connexion à {provider?.name}…</Text>
              <Text style={styles.sub}>Vérification de votre identité en cours.</Text>
            </View>
          )}

          {/* ─── ÉTAPE 3 : Confirmation des données ─── */}
          {phase === "confirm" && (
            <>
              <View style={styles.confirmHeader}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={24} color="#000091" />
                </View>
                <Text style={styles.title}>Données récupérées via {provider?.name}</Text>
                <Text style={styles.sub}>Vérifiez et confirmez les informations qui seront partagées avec LocaShare.</Text>
              </View>

              <View style={styles.dataCard}>
                <DataRow label="Prénom" value={identity.given_name} onChange={(v) => setIdentity({ ...identity, given_name: v })} />
                <DataRow label="Nom"    value={identity.family_name} onChange={(v) => setIdentity({ ...identity, family_name: v })} />
                <DataRow label="Email"  value={identity.email} onChange={(v) => setIdentity({ ...identity, email: v })} keyboardType="email-address" />
                <DataRow label="Date de naissance" value={identity.birthdate} onChange={(v) => setIdentity({ ...identity, birthdate: v })} />
              </View>

              <Text style={styles.consentText}>
                {"En continuant, vous autorisez le partage de ces données avec LocaShare uniquement aux fins de vérification d'identité (KYC), conformément au RGPD."}
              </Text>

              {error && <Text style={styles.errText}>{error}</Text>}

              <TouchableOpacity onPress={finalize} style={styles.cta} activeOpacity={0.85} testID="fc-confirm-btn">
                <Text style={styles.ctaText}>Continuer vers LocaShare</Text>
                <Ionicons name="arrow-forward" size={18} color="#000091" />
              </TouchableOpacity>
            </>
          )}

          {/* ─── ÉTAPE 4 : Succès ─── */}
          {phase === "finalize" && !error && (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <View style={[styles.checkCircle, { width: 80, height: 80, marginBottom: 20 }]}>
                <Ionicons name="checkmark" size={44} color="#000091" />
              </View>
              <Text style={[styles.title, { fontSize: 22 }]}>Identité vérifiée ✓</Text>
              <Text style={styles.sub}>{"Vous êtes maintenant connecté à LocaShare avec une identité validée par l'État."}</Text>
              <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DataRow({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
}) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={styles.dataInput}
        placeholderTextColor="rgba(255,255,255,0.4)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fcLogoWrap: { backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  cancel: { color: "#fff", fontSize: 14, fontWeight: "700", padding: 4 },
  body: { padding: spacing.lg, paddingBottom: 80 },

  title: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: -0.3, marginTop: 8 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 19, marginTop: 6 },

  // Provider buttons
  provBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  provIco: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  provName: { color: "#fff", fontSize: 14, fontWeight: "700", flex: 1 },

  // Loader
  loadCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 20 },

  // Confirm
  confirmHeader: { alignItems: "center", marginBottom: 24 },
  checkCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#FFD700",
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  dataCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  dataRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  dataLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  dataInput: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 4, paddingVertical: 4 },
  consentText: { color: "rgba(255,255,255,0.7)", fontSize: 11, lineHeight: 16, marginBottom: 16, textAlign: "center" },
  errText: { color: "#FCA5A5", fontSize: 13, textAlign: "center", marginBottom: 10 },

  cta: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: "#000091", fontSize: 15, fontWeight: "900" },
});
