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
import { apiFetch, useAuth } from "../../src/auth";
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
  const [photo, setPhoto] = useState<string>(SAMPLE);
  const [loading, setLoading] = useState(false);

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
      router.push("/(auth)/login");
      return;
    }
    if (!title || !description || !price || !address) {
      Alert.alert("Champs manquants", "Veuillez remplir tous les champs.");
      return;
    }
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
            price_per_day: parseFloat(price),
            photos: [photo],
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
      Alert.alert("Erreur", e.message);
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
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.4, radius: 16, offsetY: 6 })]}
              onPress={() => router.push("/(auth)/login")}
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
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Publier une annonce</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>Mettez en location en quelques secondes</Text>

              <TouchableOpacity onPress={pickImage} testID="pick-image-btn" style={{ marginTop: spacing.lg }}>
                <Glass borderRadius={radius.lg} style={[styles.imageBox, { borderColor: colors.primary }]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.image} />
                  ) : (
                    <View style={styles.placeholder}>
                      <Ionicons name="camera-outline" size={36} color={colors.primary} />
                      <Text style={[styles.placeholderText, { color: colors.primary }]}>Ajouter une photo</Text>
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
                    <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)} testID={`create-cat-${c.id}`} style={{ marginRight: 8 }}>
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

              <Text style={[styles.label, { color: colors.textPrimary }]}>Titre de l'annonce</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Ex: Tesla Model 3 - berline électrique"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textTertiary}
                testID="create-title-input"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Décrivez votre objet, son état, ses caractéristiques..."
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
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor={colors.textTertiary}
                testID="create-price-input"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Lieu de retrait</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Ex: Paris 11ème"
                value={address}
                onChangeText={setAddress}
                placeholderTextColor={colors.textTertiary}
                testID="create-address-input"
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 18, offsetY: 8 })]}
                onPress={submit}
                disabled={loading}
                testID="create-submit-btn"
              >
                {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={[styles.submitText, { color: colors.textInverse }]}>Publier l'annonce</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 160 },
  heading: { fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  sub: { fontSize: 14, marginTop: 4 },
  imageBox: { height: 200, alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", overflow: "hidden", position: "relative" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  placeholderText: { fontWeight: "700" },
  editBadge: { position: "absolute", bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.sm + 2, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
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
