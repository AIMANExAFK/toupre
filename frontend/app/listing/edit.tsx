import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

// Modifier une annonce publiée (spec 005, US4). Supprimer puis republier ferait
// perdre les avis reçus : la correction doit rester une correction.
// Seuls les champs réellement modifiés sont envoyés.

const CATEGORIES = [
  { id: "car", label: "Voiture", icon: "car" },
  { id: "bike", label: "Vélo", icon: "bicycle" },
  { id: "tool", label: "Outil", icon: "construct" },
  { id: "tech", label: "Tech", icon: "camera" },
  { id: "camping", label: "Camping", icon: "sunny" },
  { id: "other", label: "Autre", icon: "cube" },
];

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [origine, setOrigine] = useState<any>(null);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("other");
  const [prix, setPrix] = useState("");
  const [adresse, setAdresse] = useState("");
  const [photo, setPhoto] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!id) return;
    try {
      const a = await apiFetch(`/api/listings/${id}`);
      setOrigine(a);
      setTitre(a.title || "");
      setDescription(a.description || "");
      setCategorie(a.category || "other");
      setPrix(String(a.price_per_day ?? ""));
      setAdresse(a.location?.address || "");
      setPhoto(a.photos?.[0] || "");
    } catch (e: any) {
      setErreur(e?.message || "Annonce introuvable.");
    }
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  const choisirPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setErreur("Autorisez l'accès aux photos."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.6, base64: true,
    });
    if (!r.canceled && r.assets?.[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
    }
  };

  // N'envoyer que ce qui a changé : le serveur ignore les champs absents.
  const changements = () => {
    if (!origine) return {};
    const d: any = {};
    if (titre.trim() && titre.trim() !== origine.title) d.title = titre.trim();
    if (description.trim() && description.trim() !== origine.description) d.description = description.trim();
    if (categorie !== origine.category) d.category = categorie;
    const p = parseFloat(prix.replace(",", "."));
    if (!isNaN(p) && p > 0 && p !== origine.price_per_day) d.price_per_day = p;
    if (adresse.trim() && adresse.trim() !== origine.location?.address) {
      d.location = { ...origine.location, address: adresse.trim() };
    }
    if (photo && photo !== origine.photos?.[0]) d.photos = [photo, ...(origine.photos || []).slice(1)];
    return d;
  };

  const diff = origine ? changements() : {};
  const modifie = Object.keys(diff).length > 0;
  const valide = titre.trim().length >= 3 && description.trim().length >= 10
    && parseFloat(prix.replace(",", ".")) > 0 && adresse.trim().length >= 3;

  const enregistrer = async () => {
    if (!token || !modifie || !valide) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await apiFetch(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify(diff) }, token);
      router.replace("/(tabs)/myitems");
    } catch (e: any) {
      setErreur(e?.message || "Enregistrement impossible.");
      setEnvoi(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="edit-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} testID="edit-back">
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Modifier l'annonce</Text>
            <View style={{ width: 44 }} />
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {!origine ? (
                erreur
                  ? <Text style={[styles.erreur, { color: colors.error }]}>{erreur}</Text>
                  : <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Changer la photo de l'annonce"
                    onPress={choisirPhoto}
                    testID="edit-photo"
                  >
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.photo} alt={`Photo de ${titre}`} />
                    ) : (
                      <View style={[styles.photo, styles.photoVide, { borderColor: colors.border }]}>
                        <Ionicons name="image-outline" size={30} color={colors.textTertiary} />
                      </View>
                    )}
                    <View style={[styles.badgePhoto, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="camera-outline" size={16} color={colors.primary} />
                    </View>
                  </TouchableOpacity>

                  <Champ label="Titre" colors={colors}>
                    <TextInput value={titre} onChangeText={setTitre} maxLength={80}
                      style={[styles.champ, { color: colors.textPrimary }]} testID="edit-titre" />
                  </Champ>

                  <Champ label="Description" colors={colors}>
                    <TextInput value={description} onChangeText={setDescription} multiline
                      style={[styles.champ, styles.zone, { color: colors.textPrimary }]} testID="edit-description" />
                  </Champ>

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Catégorie</Text>
                  <View style={styles.cats}>
                    {CATEGORIES.map((c) => {
                      const actif = c.id === categorie;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Catégorie ${c.label}`}
                          accessibilityState={{ selected: actif }}
                          onPress={() => setCategorie(c.id)}
                          testID={`edit-cat-${c.id}`}
                          style={[styles.cat, { borderColor: actif ? colors.primary : colors.border,
                                                backgroundColor: actif ? colors.primaryTint : "transparent" }]}
                        >
                          <Ionicons name={c.icon as any} size={15} color={actif ? colors.primary : colors.textSecondary} />
                          <Text style={[styles.catTxt, { color: actif ? colors.primary : colors.textSecondary }]}>{c.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Champ label="Prix par jour (€)" colors={colors}>
                    <TextInput value={prix} onChangeText={setPrix} keyboardType="decimal-pad"
                      style={[styles.champ, { color: colors.textPrimary }]} testID="edit-prix" />
                  </Champ>

                  <Champ label="Adresse" colors={colors}>
                    <TextInput value={adresse} onChangeText={setAdresse}
                      style={[styles.champ, { color: colors.textPrimary }]} testID="edit-adresse" />
                  </Champ>

                  {erreur && <Text style={[styles.erreur, { color: colors.error }]} testID="edit-erreur">{erreur}</Text>}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.footer}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !modifie || !valide || envoi }}
              disabled={!modifie || !valide || envoi}
              onPress={enregistrer}
              testID="edit-submit"
              style={[
                styles.submit,
                { backgroundColor: modifie && valide ? colors.primary : colors.surface2 },
                modifie && valide ? shadowStyle({ color: colors.primary, opacity: 0.4, radius: 18, offsetY: 8 }) : null,
              ]}
            >
              {envoi ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={[styles.submitTxt, { color: modifie && valide ? colors.textInverse : colors.textTertiary }]}>
                  {modifie ? "Enregistrer les modifications" : "Aucune modification"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function Champ({ label, colors, children }: any) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <Glass borderRadius={radius.md} style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
        {children}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  photo: { width: "100%", height: 180, borderRadius: radius.md },
  photoVide: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed" },
  badgePhoto: {
    position: "absolute", right: 10, bottom: 10, width: 34, height: 34,
    borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 14, fontWeight: "800", marginBottom: spacing.sm, marginTop: spacing.md },
  champ: { fontSize: 15, paddingVertical: 12 },
  zone: { minHeight: 90, textAlignVertical: "top" },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1.5,
  },
  catTxt: { fontSize: 13, fontWeight: "700" },
  erreur: { fontSize: 13, fontWeight: "700", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  submit: { paddingVertical: 17, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  submitTxt: { fontSize: 16, fontWeight: "800" },
});
