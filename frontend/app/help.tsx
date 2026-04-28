import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

const FAQS = [
  { q: "Comment réserver un objet ?", a: "Recherchez un objet, choisissez vos dates, payez en ligne. Le propriétaire est notifié immédiatement." },
  { q: "Comment publier une annonce ?", a: "Allez sur l'onglet Publier, ajoutez une photo, une description, le prix par jour et le lieu. C'est en ligne en 30 secondes." },
  { q: "L'objet est-il assuré ?", a: "Oui, chaque location est couverte par notre assurance partenaire à hauteur de 5 000€." },
  { q: "Comment annuler une réservation ?", a: "Dans l'onglet Locations, ouvrez la réservation et cliquez sur Annuler. Annulation gratuite jusqu'à 24h avant." },
  { q: "Quand suis-je payé en tant que propriétaire ?", a: "48h après le début de la location, le montant est viré sur votre compte bancaire." },
  { q: "Que faire en cas de litige ?", a: "Contactez le support depuis l'app ou par email. Notre équipe répond sous 4h en moyenne." },
];

export default function Help() {
  const router = useRouter();
  const colors = useColors();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const send = () => {
    if (!subject || !message) {
      Alert.alert("Champs manquants", "Renseignez un sujet et un message.");
      return;
    }
    Alert.alert("Message envoyé ✓", "Notre équipe vous répondra sous 4h en moyenne.", [
      { text: "OK", onPress: () => { setSubject(""); setMessage(""); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="help-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Glass borderRadius={22} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </Glass>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Aide & support</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.heroRow}>
                <Quick icon="chatbubble-ellipses" label="Chat" colors={colors} onPress={() => Alert.alert("Chat", "Ouverture du chat en direct…")} />
                <Quick icon="call" label="Appeler" colors={colors} onPress={() => Linking.openURL("tel:+33180000000").catch(() => {})} />
                <Quick icon="mail" label="Email" colors={colors} onPress={() => Linking.openURL("mailto:support@locashare.fr").catch(() => {})} />
              </View>

              <Text style={[styles.section, { color: colors.textSecondary }]}>QUESTIONS FRÉQUENTES</Text>
              <Glass borderRadius={radius.lg}>
                {FAQS.map((f, i) => (
                  <View key={i}>
                    <TouchableOpacity style={styles.faqRow} onPress={() => setOpen(open === i ? null : i)} testID={`faq-${i}`}>
                      <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{f.q}</Text>
                      <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
                    </TouchableOpacity>
                    {open === i && (
                      <View style={styles.faqAnswer}>
                        <Text style={[styles.faqA, { color: colors.textSecondary }]}>{f.a}</Text>
                      </View>
                    )}
                    {i < FAQS.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />}
                  </View>
                ))}
              </Glass>

              <Text style={[styles.section, { color: colors.textSecondary }]}>NOUS CONTACTER</Text>
              <Glass borderRadius={radius.lg} style={{ padding: spacing.md }}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Sujet</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder="Ex: Problème de paiement"
                  value={subject} onChangeText={setSubject}
                  placeholderTextColor={colors.textTertiary}
                  testID="contact-subject"
                />
                <Text style={[styles.label, { color: colors.textPrimary }]}>Message</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 120, textAlignVertical: "top" }]}
                  placeholder="Décrivez votre problème ou question..."
                  value={message} onChangeText={setMessage} multiline
                  placeholderTextColor={colors.textTertiary}
                  testID="contact-message"
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.4, radius: 16, offsetY: 6 })]}
                  onPress={send} testID="contact-send"
                >
                  <Ionicons name="send" size={16} color={colors.textInverse} />
                  <Text style={[styles.sendText, { color: colors.textInverse }]}>Envoyer</Text>
                </TouchableOpacity>
              </Glass>

              <Text style={[styles.foot, { color: colors.textTertiary }]}>
                Réponse moyenne : 4h · Disponible 7j/7
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function Quick({ icon, label, colors, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
      <Glass borderRadius={radius.md} style={styles.quick}>
        <View style={[styles.quickIcon, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <Text style={[styles.quickLabel, { color: colors.textPrimary }]}>{label}</Text>
      </Glass>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  heroRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
  quick: { alignItems: "center", padding: spacing.md, gap: 6 },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontWeight: "700" },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 4 },
  faqRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 12 },
  faqQ: { flex: 1, fontSize: 15, fontWeight: "700" },
  faqAnswer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  faqA: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: radius.sm + 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  sendText: { fontWeight: "800", fontSize: 15 },
  foot: { fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
