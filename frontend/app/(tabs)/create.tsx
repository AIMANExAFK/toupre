import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, useAuth, ApiError } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

const CATEGORIES = [
  { id: "car", label: "Voiture", icon: "car" },
  { id: "bike", label: "Vélo", icon: "bicycle" },
  { id: "tool", label: "Outil", icon: "construct" },
  { id: "tech", label: "Tech", icon: "camera" },
  { id: "camping", label: "Camping", icon: "sunny" },
  { id: "other", label: "Autre", icon: "cube" },
];

const SAMPLE = "https://images.pexels.com/photos/24376862/pexels-photo-24376862.jpeg";

export default function Create() {
  const { token, user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("car");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const isReady = Boolean(title.trim() && description.trim() && price.trim() && address.trim());

  const pickImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès aux photos pour continuer.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submit = async () => {
    if (!user) {
      router.push("/auth/otp");
      return;
    }
    // Vérification email+téléphone obligatoire pour publier
    if (!user.verified) {
      Alert.alert(
        "Coordonnées à vérifier",
        "Pour publier une annonce, vérifiez votre email et votre numéro avec un code.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Recevoir un code", onPress: () => router.push("/auth/otp?reason=publish") },
        ],
      );
      return;
    }
    if (!title || !description || !price || !address) {
      Alert.alert("Champs manquants", "Veuillez remplir tous les champs.");
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Prix invalide", "Entrez un prix par jour valide (ex: 25).");
      return;
    }
    const finalPhoto = photo || SAMPLE;
    setLoading(true);
    try {
      await apiFetch(
        "/api/listings",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            category,
            price_per_day: parsedPrice,
            photos: [finalPhoto],
            location: { lat: 48.8566, lng: 2.3522, address },
          }),
        },
        token
      );
      Alert.alert("Annonce publiée 🎉", "Votre objet est maintenant en location !", [
        {
          text: "OK",
          onPress: () => {
            setTitle(""); setDescription(""); setPrice(""); setAddress("");
            router.push("/(tabs)/myitems");
          },
        },
      ]);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "CONTENT_BLOCKED") {
        Alert.alert(
          "Contenu interdit détecté",
          (e.reasons || []).join("\n") || e.message,
        );
      } else if (e instanceof ApiError && e.code === "KYC_REQUIRED") {
        Alert.alert("Vérification requise", e.message, [
          { text: "Recevoir un code", onPress: () => router.push("/auth/otp") },
        ]);
      } else {
        Alert.alert("Erreur", e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientBg>
          <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg }}>
            <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
            </Glass>
            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>Connectez-vous</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>Pour publier une annonce</Text>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.btn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.4, radius: 16, offsetY: 6 })]}
              onPress={() => router.push("/auth/otp")}
            >
              <Text style={[styles.btnText, { color: colors.textInverse }]}>Se connecter</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </GradientBg>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="create-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <TouchableOpacity accessibilityLabel="Retour" accessibilityRole="button" onPress={() => router.push("/(tabs)")} testID="create-back-btn">
                  <Glass borderRadius={22} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                  </Glass>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Publier</Text>
                <View style={{ width: 44 }} />
              </View>

              <View style={styles.topBlock}>
                <Text style={[styles.kicker, { color: colors.primary }]}>Nouvelle annonce</Text>
                <Text style={[styles.heading, { color: colors.textPrimary }]}>Publier un bien</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  Ajoutez les informations essentielles pour inspirer confiance dès la première vue.
                </Text>
              </View>

              <Glass borderRadius={radius.lg} style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{"Qualité de l'annonce"}</Text>
                  <Text style={[styles.progressValue, { color: colors.primary }]}>
                    {[title, description, price, address, photo].filter(Boolean).length}/5
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${([title, description, price, address, photo].filter(Boolean).length / 5) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </Glass>

              <TouchableOpacity accessibilityRole="button" onPress={pickImage} testID="pick-image-btn" style={{ marginTop: spacing.lg }}>
                <Glass borderRadius={radius.lg} style={[styles.imageBox, { borderColor: colors.primary }]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.image} alt="Photo choisie pour votre annonce" />
                  ) : (
                    <View style={styles.placeholder}>
                      <Ionicons name="camera-outline" size={36} color={colors.primary} />
                      <Text style={[styles.placeholderText, { color: colors.primary }]}>Ajouter une photo claire</Text>
                      <Text style={[styles.placeholderHint, { color: colors.textSecondary }]}>Face avant, bon éclairage, objet entier</Text>
                    </View>
                  )}
                  <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="camera" size={14} color={colors.textInverse} />
                  </View>
                </Glass>
              </TouchableOpacity>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((c) => {
                  const active = category === c.id;
                  return (
                    <TouchableOpacity accessibilityRole="button" key={c.id} onPress={() => setCategory(c.id)} testID={`create-cat-${c.id}`} style={{ marginRight: 8 }}>
                      {active ? (
                        <View style={[styles.catChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                          <Ionicons name={c.icon as any} size={16} color={colors.textInverse} />
                          <Text style={[styles.catText, { color: colors.textInverse }]}>{c.label}</Text>
                        </View>
                      ) : (
                        <Glass borderRadius={999} style={styles.catChip}>
                          <Ionicons name={c.icon as any} size={16} color={colors.textPrimary} />
                          <Text style={[styles.catText, { color: colors.textPrimary }]}>{c.label}</Text>
                        </Glass>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.label, { color: colors.textPrimary }]}>{"Titre de l'annonce"}</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Ex: Perceuse Bosch sans fil"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textTertiary}
                testID="create-title-input"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="État, accessoires inclus, consignes de retrait, caution éventuelle..."
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor={colors.textTertiary}
                testID="create-description-input"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Prix / jour (€)</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="25"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor={colors.textTertiary}
                testID="create-price-input"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Lieu de retrait</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Ex: Paris 11e, proche Bastille"
                value={address}
                onChangeText={setAddress}
                placeholderTextColor={colors.textTertiary}
                testID="create-address-input"
              />

              <TouchableOpacity accessibilityRole="button"
                style={[
                  styles.submitBtn,
                  { backgroundColor: isReady ? colors.primary : colors.surface2 },
                  (loading || !isReady) && { opacity: 0.78 },
                  isReady && shadowStyle({ color: colors.primary, opacity: 0.32, radius: 14, offsetY: 6 }),
                ]}
                onPress={submit}
                disabled={loading || !isReady} accessibilityState={{ disabled: loading || !isReady }}
                testID="create-submit-btn"
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={[styles.submitText, { color: isReady ? colors.textInverse : colors.textSecondary }]}>
                    {"Publier l'annonce"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 180 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "900" },
  topBlock: { gap: 5 },
  kicker: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  heading: { fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  sub: { fontSize: 14, lineHeight: 21, marginTop: 2 },
  progressCard: { marginTop: spacing.lg, padding: spacing.md },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: "800" },
  progressValue: { fontSize: 13, fontWeight: "900" },
  progressTrack: { height: 7, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  imageBox: { height: 200, alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", overflow: "hidden", position: "relative" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  placeholderText: { fontWeight: "800" },
  placeholderHint: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  editBadge: { position: "absolute", bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "transparent" },
  catText: { fontSize: 13, fontWeight: "700" },
  submitBtn: { paddingVertical: 17, borderRadius: radius.md, alignItems: "center", marginTop: spacing.xl },
  submitText: { fontSize: 16, fontWeight: "700" },
  guestTitle: { fontSize: 22, fontWeight: "800", marginTop: 16 },
  guestSub: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.md, marginTop: 8 },
  btnText: { fontWeight: "700", fontSize: 15 },
});
