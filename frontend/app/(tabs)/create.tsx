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
import { colors, spacing, radius, shadows } from "../../src/theme";

const CATEGORIES = [
  { id: "car", label: "Voiture", icon: "car" },
  { id: "bike", label: "Vélo", icon: "bicycle" },
  { id: "tool", label: "Outil", icon: "construct" },
  { id: "tech", label: "Tech", icon: "camera" },
  { id: "camping", label: "Camping", icon: "sunny" },
  { id: "other", label: "Autre", icon: "cube" },
];

const SAMPLE_IMAGES = [
  "https://images.pexels.com/photos/24376862/pexels-photo-24376862.jpeg",
  "https://images.pexels.com/photos/90454/pexels-photo-90454.jpeg",
  "https://images.pexels.com/photos/30413428/pexels-photo-30413428.jpeg",
  "https://images.unsplash.com/photo-1624923686627-514dd5e57bae",
  "https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg",
];

export default function Create() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("car");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string>(SAMPLE_IMAGES[0]);
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
            setTitle("");
            setDescription("");
            setPrice("");
            setAddress("");
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
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyAuth}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Connectez-vous pour publier</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push("/(auth)/login")}
            testID="goto-login-btn"
          >
            <Text style={styles.btnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="create-screen" edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Publier une annonce</Text>
          <Text style={styles.sub}>Mettez en location un objet en quelques secondes</Text>

          <TouchableOpacity style={styles.imageBox} onPress={pickImage} testID="pick-image-btn">
            {photo ? (
              <Image source={{ uri: photo }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="camera-outline" size={36} color={colors.primary} />
                <Text style={styles.placeholderText}>Ajouter une photo</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color={colors.surface} />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, active && styles.catActive]}
                  onPress={() => setCategory(c.id)}
                  testID={`create-cat-${c.id}`}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={16}
                    color={active ? colors.surface : colors.textPrimary}
                  />
                  <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Titre de l'annonce</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Tesla Model 3 - berline électrique"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.textTertiary}
            testID="create-title-input"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre objet, son état, ses caractéristiques..."
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor={colors.textTertiary}
            testID="create-description-input"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Prix / jour (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor={colors.textTertiary}
                testID="create-price-input"
              />
            </View>
          </View>

          <Text style={styles.label}>Lieu de retrait</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Paris 11ème"
            value={address}
            onChangeText={setAddress}
            placeholderTextColor={colors.textTertiary}
            testID="create-address-input"
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={submit}
            disabled={loading}
            testID="create-submit-btn"
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitText}>Publier l'annonce</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  heading: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  imageBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    height: 200,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primaryTint,
    borderStyle: "dashed",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: { color: colors.primary, fontWeight: "600" },
  editBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: spacing.md },
  catScroll: { marginVertical: 4 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  catTextActive: { color: colors.surface },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.xl,
    ...shadows.primary,
  },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: "600" },
  emptyAuth: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.lg },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: 8 },
  btnText: { color: colors.surface, fontWeight: "600" },
});
