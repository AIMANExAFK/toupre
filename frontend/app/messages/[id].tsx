import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth, ApiError } from "../../src/auth";
import { useColors, spacing } from "../../src/theme";
import { Glass } from "../../src/Glass";
import { ReportModal } from "../../src/ReportModal";

type Message = {
  id: string;
  from_id: string;
  to_id: string;
  content: string;
  listing_id: string | null;
  read: boolean;
  created_at: string;
};

export default function ChatScreen() {
  const { id, listingId } = useLocalSearchParams<{ id: string; listingId?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [peer, setPeer] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/conversations/${id}`);
      setPeer(data.peer);
      setMessages(data.messages || []);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.log("[chat]", e);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Polling pour récupérer les nouveaux messages (auto-reply mock)
  useEffect(() => {
    const t = setInterval(load, 3500);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setBlockedError(null);
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ to_id: id, content, listing_id: listingId || null }),
      });
      setDraft("");
      await load();
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "CONTENT_BLOCKED") {
        setBlockedError(e.message);
      } else if (e instanceof ApiError && e.code === "KYC_REQUIRED") {
        setBlockedError(null);
        setDraft(content);
        router.push("/auth/otp?reason=message");
      } else {
        console.log("[send]", e);
      }
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textPrimary }}>Connexion requise</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <Glass borderRadius={0} style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity accessibilityLabel="Retour" accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {(peer?.name || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
                {peer?.name || "Chargement..."}
              </Text>
              <Text style={[styles.headerStatus, { color: colors.success }]}>● En ligne</Text>
            </View>
          </View>
          <TouchableOpacity accessibilityLabel="Signaler" accessibilityRole="button" onPress={() => setReportOpen(true)} style={styles.iconBtn} testID="report-user-btn">
            <Ionicons name="flag-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </Glass>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.md, gap: 6 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item, index }) => {
            const mine = item.from_id === user.id;
            const prev = messages[index - 1];
            const showAv = !prev || prev.from_id !== item.from_id;
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                {!mine && showAv ? (
                  <View style={[styles.bubbleAv, { backgroundColor: colors.surface2 }]}>
                    <Text style={[styles.bubbleAvText, { color: colors.textPrimary }]}>
                      {(peer?.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : !mine ? <View style={{ width: 28 }} /> : null}
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                      : { backgroundColor: colors.surface2, borderBottomLeftRadius: 4 },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: mine ? colors.textInverse : colors.textPrimary }]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.bubbleTime, { color: mine ? "rgba(255,255,255,0.7)" : colors.textTertiary }]}>
                    {new Date(item.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Démarrez la conversation
              </Text>
            </View>
          }
        />
      )}

      {blockedError && (
        <View style={{
          backgroundColor: colors.errorBg, borderTopWidth: 1, borderTopColor: colors.error,
          padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 8,
        }}>
          <Ionicons name="shield-outline" size={16} color={colors.error} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.error, lineHeight: 16 }}>
            {blockedError}
          </Text>
          <TouchableOpacity accessibilityLabel="Fermer" accessibilityRole="button" onPress={() => setBlockedError(null)}>
            <Ionicons name="close" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
      <SafeAreaView edges={["bottom"]} style={[styles.inputWrap, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <View style={[styles.inputRow, { backgroundColor: colors.surface2 }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrivez un message..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.textPrimary }]}
            multiline
            maxLength={500}
            testID="chat-input"
          />
          <TouchableOpacity accessibilityRole="button"
            accessibilityLabel="Envoyer le message"
            accessibilityState={{ disabled: !draft.trim() || sending }}
            onPress={send}
            disabled={!draft.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: draft.trim() ? colors.primary : colors.surface2 }]}
            testID="chat-send"
          >
            <Ionicons
              name={sending ? "hourglass-outline" : "send"}
              size={18}
              color={draft.trim() ? colors.textInverse : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={String(id || "")}
        targetLabel={peer?.name}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerWrap: { zIndex: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800" },
  headerName: { fontSize: 15, fontWeight: "800" },
  headerStatus: { fontSize: 11, fontWeight: "600" },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginVertical: 1 },
  bubbleRowMine: { flexDirection: "row-reverse" },
  bubbleAv: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubbleAvText: { fontSize: 11, fontWeight: "800" },
  bubble: {
    maxWidth: "72%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTime: { fontSize: 10, fontWeight: "600", alignSelf: "flex-end" },
  empty: { paddingVertical: spacing.xl * 2, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
  inputWrap: { borderTopWidth: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
