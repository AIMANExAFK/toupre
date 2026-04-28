import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

type Card = { id: string; brand: string; last4: string; exp: string; isDefault: boolean };

const INITIAL_CARDS: Card[] = [
  { id: "1", brand: "visa", last4: "4242", exp: "12/27", isDefault: true },
  { id: "2", brand: "mastercard", last4: "8852", exp: "08/26", isDefault: false },
];

export default function Payments() {
  const router = useRouter();
  const colors = useColors();
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [showAdd, setShowAdd] = useState(false);
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  const addCard = () => {
    const cleaned = num.replace(/\s/g, "");
    if (cleaned.length < 12 || !exp || cvc.length < 3) {
      Alert.alert("Champs invalides", "Remplissez correctement les informations de la carte.");
      return;
    }
    const last4 = cleaned.slice(-4);
    const brand = cleaned.startsWith("4") ? "visa" : cleaned.startsWith("5") ? "mastercard" : "card";
    setCards([...cards.map((c) => ({ ...c, isDefault: false })), { id: String(Date.now()), brand, last4, exp, isDefault: true }]);
    setShowAdd(false); setNum(""); setExp(""); setCvc("");
    Alert.alert("Carte ajoutée ✓", `Votre carte se terminant par ${last4} a été ajoutée.`);
  };

  const setDefault = (id: string) => setCards(cards.map((c) => ({ ...c, isDefault: c.id === id })));
  const removeCard = (id: string) => {
    Alert.alert("Supprimer la carte ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => setCards(cards.filter((c) => c.id !== id)) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="payments-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Glass borderRadius={22} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </Glass>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Paiement</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.section, { color: colors.textSecondary }]}>MES CARTES</Text>
              {cards.map((card) => (
                <View key={card.id} style={{ marginBottom: spacing.md }}>
                  <Glass borderRadius={radius.lg}>
                    <View style={[styles.card, { borderColor: card.isDefault ? colors.primary : "transparent", borderWidth: card.isDefault ? 2 : 0 }]}>
                      <View style={[styles.brand, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.brandText, { color: colors.textInverse }]}>
                          {card.brand === "visa" ? "VISA" : card.brand === "mastercard" ? "MC" : "CB"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardNum, { color: colors.textPrimary }]}>•••• •••• •••• {card.last4}</Text>
                        <Text style={[styles.cardExp, { color: colors.textSecondary }]}>Expire {card.exp}</Text>
                      </View>
                      {card.isDefault && (
                        <View style={[styles.defaultPill, { backgroundColor: colors.successBg }]}>
                          <Text style={[styles.defaultText, { color: colors.success }]}>Par défaut</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                      {!card.isDefault && (
                        <TouchableOpacity onPress={() => setDefault(card.id)} style={styles.cardAction}>
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                          <Text style={[styles.cardActionText, { color: colors.primary }]}>Définir par défaut</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => removeCard(card.id)} style={styles.cardAction}>
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={[styles.cardActionText, { color: colors.error }]}>Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  </Glass>
                </View>
              ))}

              {!showAdd && (
                <TouchableOpacity onPress={() => setShowAdd(true)} testID="add-card-btn">
                  <Glass borderRadius={radius.lg} style={[styles.addBtn, { borderColor: colors.primary }]}>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                    <Text style={[styles.addText, { color: colors.primary }]}>Ajouter une carte</Text>
                  </Glass>
                </TouchableOpacity>
              )}

              {showAdd && (
                <Glass borderRadius={radius.lg} style={{ padding: spacing.md, marginTop: spacing.sm }}>
                  <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Nouvelle carte</Text>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Numéro de carte</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="4242 4242 4242 4242"
                    keyboardType="numeric"
                    value={num} onChangeText={setNum}
                    placeholderTextColor={colors.textTertiary}
                    maxLength={19}
                  />
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>Expiration</Text>
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                        placeholder="MM/AA" value={exp} onChangeText={setExp}
                        placeholderTextColor={colors.textTertiary} maxLength={5}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>CVC</Text>
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                        placeholder="123" value={cvc} onChangeText={setCvc} keyboardType="numeric"
                        placeholderTextColor={colors.textTertiary} maxLength={4} secureTextEntry
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
                    <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.btnGhost, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={addCard} testID="save-card-btn"
                      style={[styles.btnPrimary, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 12, offsetY: 4 })]}
                    >
                      <Text style={{ color: colors.textInverse, fontWeight: "800" }}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </Glass>
              )}

              <View style={[styles.notice, { backgroundColor: colors.successBg }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                <Text style={[styles.noticeText, { color: colors.success }]}>
                  Paiements sécurisés par Stripe · Chiffrement end-to-end
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: spacing.sm, paddingHorizontal: 4 },
  card: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md, borderRadius: radius.lg },
  brand: { width: 48, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  cardNum: { fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  cardExp: { fontSize: 12, marginTop: 2 },
  defaultPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  defaultText: { fontSize: 11, fontWeight: "800" },
  cardActions: { flexDirection: "row", gap: 16, padding: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1 },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardActionText: { fontSize: 13, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderWidth: 2, borderStyle: "dashed" },
  addText: { fontSize: 15, fontWeight: "700" },
  formTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: radius.sm + 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btnGhost: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: "center", borderWidth: 1 },
  btnPrimary: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  noticeText: { fontSize: 13, fontWeight: "600", flex: 1 },
});
