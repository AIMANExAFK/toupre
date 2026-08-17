import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, useAuth } from "../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

const FAQS = [
  {
    q: "Comment réserver un objet ?",
    a: "Recherchez un objet, choisissez vos dates, puis envoyez la demande. Le propriétaire confirme, puis le règlement se fait en espèces à la remise.",
  },
  {
    q: "Comment publier une annonce ?",
    a: "Ajoutez une photo, un titre clair, le prix par jour et le lieu de retrait depuis l'onglet Publier.",
  },
  {
    q: "Comment annuler une réservation ?",
    a: "Ouvrez l'onglet Locations, sélectionnez la réservation concernée, puis utilisez l'action d'annulation si elle est encore disponible.",
  },
  {
    q: "Que faire en cas de litige ?",
    a: "Envoyez un message au support avec le numéro de réservation, des photos si besoin et une description courte du problème.",
  },
];

const QUICK_REPLIES = ["Réservation", "Espèces", "Annonce", "Litige"];

export default function Help() {
  const router = useRouter();
  const colors = useColors();
  const { token, user } = useAuth();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { from: "support", text: "Bonjour, expliquez-nous ce qui bloque." },
  ]);

  const send = async () => {
    if (!token || !user) {
      router.push("/auth/otp");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Champs manquants", "Ajoutez un sujet et un message pour contacter le support.");
      return;
    }
    setSending(true);
    try {
      const ticket = await apiFetch(
        "/api/support/tickets",
        {
          method: "POST",
          body: JSON.stringify({ subject, message, category: "support" }),
        },
        token,
      );
      Alert.alert("Message envoyé", `Ticket ${String(ticket.id).slice(0, 8)} ouvert.`, [
        { text: "OK", onPress: () => { setSubject(""); setMessage(""); } },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSending(false);
    }
  };

  const sendChat = async () => {
    if (!chatDraft.trim()) return;
    if (!token || !user) {
      setChatMessages([
        ...chatMessages,
        { from: "user", text: chatDraft.trim() },
        { from: "support", text: "Connectez-vous pour ouvrir un ticket suivi par le support." },
      ]);
      setChatDraft("");
      return;
    }
    const text = chatDraft.trim();
    setChatDraft("");
    setChatMessages([
      ...chatMessages,
      { from: "user", text },
      { from: "support", text: "Merci, j'ouvre un ticket support." },
    ]);
    try {
      const ticket = await apiFetch(
        "/api/support/tickets",
        {
          method: "POST",
          body: JSON.stringify({ subject: `Chat support - ${text.slice(0, 32)}`, message: text, category: "chat" }),
        },
        token,
      );
      setChatMessages((items) => [
        ...items,
        { from: "support", text: `Ticket ${String(ticket.id).slice(0, 8)} ouvert.` },
      ]);
    } catch (e: any) {
      setChatMessages((items) => [
        ...items,
        { from: "support", text: e.message || "Impossible d'ouvrir le ticket pour le moment." },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="help-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.header}>
              <TouchableOpacity accessibilityLabel="Retour" accessibilityRole="button" onPress={() => router.replace("/(tabs)/profile")} testID="help-back">
                <Glass borderRadius={22} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </Glass>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Aide</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Glass borderRadius={radius.lg} style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="headset" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>Contacter le support</Text>
                    <Text style={[styles.contactSub, { color: colors.textSecondary }]}>
                      Réponse moyenne sous 4h
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionMini, { color: colors.textSecondary }]}>APPELER</Text>
                <TouchableOpacity accessibilityRole="button"
                  activeOpacity={0.85}
                  style={[styles.callButton, { backgroundColor: colors.primary }]}
                  testID="support-call"
                  onPress={() => Alert.alert("Appeler le support", "01 80 00 00 00")}
                >
                  <Ionicons name="call" size={18} color={colors.textInverse} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.callTitle, { color: colors.textInverse }]}>01 80 00 00 00</Text>
                    <Text style={[styles.callSub, { color: colors.textInverse }]}>Disponible de 9h à 20h</Text>
                  </View>
                </TouchableOpacity>

                <Text style={[styles.sectionMini, { color: colors.textSecondary }]}>ENVOYER UN MESSAGE</Text>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Sujet</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                  placeholder="Ex: Problème avec une réservation"
                  value={subject}
                  onChangeText={setSubject}
                  placeholderTextColor={colors.textTertiary}
                  testID="contact-subject"
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>Message</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                  placeholder="Expliquez le problème en quelques lignes..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  placeholderTextColor={colors.textTertiary}
                  testID="contact-message"
                />

                <TouchableOpacity accessibilityRole="button"
                  style={[
                    styles.sendBtn,
                    { backgroundColor: colors.primary },
                    sending && { opacity: 0.7 },
                    shadowStyle({ color: colors.primary, opacity: 0.32, radius: 14, offsetY: 6 }),
                  ]}
                  onPress={send}
                  disabled={sending} accessibilityState={{ disabled: sending }}
                  testID="contact-send"
                >
                  <Ionicons name="send" size={16} color={colors.textInverse} />
                  <Text style={[styles.sendText, { color: colors.textInverse }]}>{sending ? "Envoi..." : "Envoyer"}</Text>
                </TouchableOpacity>
              </Glass>

              <Text style={[styles.section, { color: colors.textSecondary }]}>CHAT DIRECT</Text>
              <Glass borderRadius={radius.lg} style={styles.chatCard}>
                <View style={styles.chatHeader}>
                  <View style={[styles.agentAvatar, { backgroundColor: colors.primary }]}>
                    <Ionicons name="chatbubble-ellipses" size={21} color={colors.textInverse} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chatTitle, { color: colors.textPrimary }]}>Assistant support</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.statusText, { color: colors.textSecondary }]}>En ligne maintenant</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.chatTranscript, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {chatMessages.map((item, index) => {
                    const isUser = item.from === "user";
                    return (
                      <View key={`${item.text}-${index}`} style={isUser ? styles.messageOut : styles.messageIn}>
                        {!isUser && (
                          <View style={[styles.miniAvatar, { backgroundColor: colors.primaryTint }]}>
                            <Ionicons name="headset" size={13} color={colors.primary} />
                          </View>
                        )}
                        <View
                          style={[
                            styles.chatBubble,
                            isUser ? styles.chatBubbleUser : styles.chatBubbleSupport,
                            { backgroundColor: isUser ? colors.primary : colors.surface2 },
                          ]}
                        >
                          <Text style={[styles.chatBubbleText, { color: isUser ? colors.textInverse : colors.textPrimary }]}>
                            {item.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplies}>
                  {QUICK_REPLIES.map((reply) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={reply}
                      activeOpacity={0.8}
                      style={[styles.quickReply, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setChatDraft(reply)}
                    >
                      <Text style={[styles.quickReplyText, { color: colors.textPrimary }]}>{reply}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={[styles.chatComposer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.chatInput, { color: colors.textPrimary }]}
                    placeholder="Écrire au support..."
                    placeholderTextColor={colors.textTertiary}
                    value={chatDraft}
                    onChangeText={setChatDraft}
                    testID="support-chat-input"
                  />
                  <TouchableOpacity accessibilityLabel="Envoyer le message" accessibilityRole="button"
                    style={[styles.chatSend, { backgroundColor: colors.primary }]}
                    onPress={sendChat}
                    testID="support-chat-send"
                  >
                    <Ionicons name="send" size={16} color={colors.textInverse} />
                  </TouchableOpacity>
                </View>
              </Glass>

              <Text style={[styles.section, { color: colors.textSecondary }]}>QUESTIONS FRÉQUENTES</Text>
              <Glass borderRadius={radius.lg}>
                {FAQS.map((faq, index) => (
                  <View key={faq.q}>
                    <TouchableOpacity accessibilityRole="button"
                      style={styles.faqRow}
                      onPress={() => setOpen(open === index ? null : index)}
                      testID={`faq-${index}`}
                    >
                      <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{faq.q}</Text>
                      <Ionicons
                        name={open === index ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    {open === index && (
                      <View style={styles.faqAnswer}>
                        <Text style={[styles.faqA, { color: colors.textSecondary }]}>{faq.a}</Text>
                      </View>
                    )}
                    {index < FAQS.length - 1 && (
                      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />
                    )}
                  </View>
                ))}
              </Glass>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  contactCard: { padding: spacing.md, gap: spacing.sm },
  contactHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  contactIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  contactTitle: { fontSize: 18, fontWeight: "900" },
  contactSub: { fontSize: 13, marginTop: 2 },
  sectionMini: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  callButton: {
    minHeight: 58,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  callTitle: { fontSize: 15, fontWeight: "900" },
  callSub: { fontSize: 12, fontWeight: "700", opacity: 0.78, marginTop: 1 },
  chatCard: { padding: spacing.md, gap: 12 },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  agentAvatar: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chatTitle: { fontSize: 16, fontWeight: "900" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  chatTranscript: { borderWidth: 1, borderRadius: radius.md, padding: 10, gap: 10, minHeight: 132 },
  messageIn: { flexDirection: "row", alignItems: "flex-end", gap: 7, alignSelf: "flex-start", maxWidth: "88%" },
  messageOut: { alignSelf: "flex-end", maxWidth: "88%" },
  miniAvatar: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  chatBubble: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chatBubbleSupport: { borderBottomLeftRadius: 4 },
  chatBubbleUser: { borderBottomRightRadius: 4 },
  chatBubbleText: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  quickReplies: { gap: 8, paddingRight: spacing.md },
  quickReply: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  quickReplyText: { fontSize: 12, fontWeight: "800" },
  chatComposer: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 14,
    paddingVertical: 0,
  },
  chatSend: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  section: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  label: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 116, textAlignVertical: "top" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  sendText: { fontWeight: "800", fontSize: 15 },
  faqRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 12 },
  faqQ: { flex: 1, fontSize: 15, fontWeight: "700" },
  faqAnswer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  faqA: { fontSize: 14, lineHeight: 20 },
});
