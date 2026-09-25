import { useCallback, useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth, BACKEND_URL } from "../src/auth";
import { useColors, spacing, radius } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";
import { EnTeteSombre } from "../src/EnTeteSombre";
import { NotificationsManager, PasskeyManager } from "../src/NotificationsManager";

type Passkey = { credential_id: string; device_name: string; created_at: string; last_used_at: string | null };
type Session = { id: string; device: string; ip: string; created_at: string; last_seen: string };

export default function SecurityScreen() {
  const router = useRouter();
  const colors = useColors();
  const { token, user } = useAuth();

  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [ss] = await Promise.all([
        apiFetch("/api/auth/sessions", {}, token).catch(() => []),
      ]);
      setSessions(ss || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    setNotifPerm(NotificationsManager.getPermission());
    (async () => {
      setHasPasskey(await PasskeyManager.isUserVerifyingPlatformAuthenticatorAvailable());
    })();
    refresh();
  }, [refresh]);

  const askNotifications = async () => {
    const result = await NotificationsManager.requestPermission();
    setNotifPerm(result);
    if (result === "granted") {
      NotificationsManager.show("✓ Notifications activées", {
        body: "Vous recevrez maintenant les messages et demandes de réservation en temps réel.",
      });
      const pushToken = await NotificationsManager.getPushToken();
      if (pushToken && token) {
        try {
          await fetch(`${BACKEND_URL}/api/push/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ token: pushToken, device: Platform.OS === "web" ? "Web" : "Mobile" }),
          });
        } catch {}
      }
    } else if (result === "denied") {
      Alert.alert(
        "Permission refusée",
        Platform.OS === "web"
          ? "Vous avez bloqué les notifications. Pour les réactiver, cliquez sur l'icône cadenas/info à gauche de l'URL et autorisez les notifications pour ce site."
          : "Activez les notifications dans les paramètres du système.",
      );
    }
  };

  // Les gestionnaires de clés d'accès ont été retirés avec leur section (spec 003) :
  // ils appelaient des routes serveur inexistantes. La logique WebAuthn réutilisable
  // reste dans PasskeyManager (src/NotificationsManager.tsx) pour une reprise ultérieure.


  const revokeSession = (sid: string) => {
    Alert.alert("Déconnecter cette session ?", "Cet appareil sera immédiatement déconnecté.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/auth/sessions/${sid}`, { method: "DELETE" }, token);
            refresh();
          } catch (e: any) { Alert.alert("Erreur", e.message); }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <EnTeteSombre
            titre="Sécurité & Sessions"
            retour={() => router.back()}
          />

          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 }}>

            {/* ─── Notifications ─── */}
            <Glass borderRadius={radius.lg} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionIco, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notifications push</Text>
                  <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                    {notifPerm === "granted" ? "Activées sur cet appareil" : notifPerm === "denied" ? "Bloquées dans le navigateur" : notifPerm === "unsupported" ? "Non supportées" : "Non activées"}
                  </Text>
                </View>
                {notifPerm === "granted" && <View style={styles.statusDot} />}
              </View>
              {notifPerm !== "granted" && notifPerm !== "unsupported" && (
                <TouchableOpacity accessibilityRole="button" onPress={askNotifications} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="notifications" size={16} color={colors.textInverse} />
                  <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
                    {notifPerm === "denied" ? "Réactiver les notifications" : "Activer les notifications"}
                  </Text>
                </TouchableOpacity>
              )}
              {notifPerm === "granted" && (
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => NotificationsManager.show("Test Toupré ✓", { body: "Vos notifications fonctionnent !" })}
                  style={[styles.actionBtn, { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1 }]}
                >
                  <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Envoyer une notification test</Text>
                </TouchableOpacity>
              )}
            </Glass>

            {/* ─── Passkeys : section masquée (spec 003, FR-010) ───
                 Le code client WebAuthn est complet mais aucun point d'entrée
                 correspondant n'existe côté serveur : les requêtes répondaient 404
                 et la section restait vide en permanence. Afficher une protection
                 qui n'existe pas est plus dommageable que ne rien afficher.
                 Rétablir cette section dès que les routes serveur existeront. */}

            {/* ─── Sessions actives ─── */}
            <Glass borderRadius={radius.lg} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionIco, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sessions actives</Text>
                  <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                    Appareils connectés à votre compte.
                  </Text>
                </View>
              </View>

              {sessions.length > 0 ? sessions.map((s) => {
                const isThis = typeof localStorage !== "undefined" && localStorage.getItem("ls_token") === s.id;
                return (
                  <View key={s.id} style={[styles.itemRow, { borderColor: colors.border }]}>
                    <Ionicons name="laptop-outline" size={18} color={isThis ? colors.success : colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{s.device || "Appareil inconnu"}</Text>
                        {isThis && (
                          <View style={[styles.thisBadge, { backgroundColor: colors.successBg || "rgba(34,197,94,0.15)" }]}>
                            <Text style={[styles.thisBadgeText, { color: colors.success }]}>CETTE SESSION</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                        IP {s.ip} · {formatRelative(s.last_seen)}
                      </Text>
                    </View>
                    {!isThis && (
                      <TouchableOpacity accessibilityLabel="Se déconnecter" accessibilityRole="button" onPress={() => revokeSession(s.id)} style={styles.removeBtn}>
                        <Ionicons name="log-out-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }) : (
                <View style={[styles.emptyHint, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune session active.</Text>
                </View>
              )}
            </Glass>

          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function getDeviceName(): string {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return "Appareil";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows PC";
  return "Navigateur web";
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "à l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const styles = StyleSheet.create({

  section: { padding: spacing.md, gap: spacing.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.sm },
  sectionIco: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  sectionSub: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },

  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderTopWidth: 1 },
  itemTitle: { fontSize: 13, fontWeight: "600" },
  itemSub: { fontSize: 11, marginTop: 2 },
  removeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  thisBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  thisBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  emptyHint: { padding: 12, borderRadius: 8 },
  emptyText: { fontSize: 12, textAlign: "center" },
});
