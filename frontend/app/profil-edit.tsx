import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, useAuth } from "../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";
import { EnTeteSombre } from "../src/EnTeteSombre";

// Modification du profil : nom affiché et photo.
// L'email et le téléphone ne sont volontairement pas modifiables ici : ils portent
// la vérification de contact sur laquelle repose la confiance entre voisins.

export default function ProfilEdit() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [nom, setNom] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [initialise, setInitialise] = useState(Boolean(user));

  // Le contexte d'authentification se charge après le premier rendu : sur une
  // ouverture directe de l'écran, l'état initial serait figé sur des valeurs vides.
  useEffect(() => {
    if (user && !initialise) {
      setNom(user.name ?? "");
      setAvatar(user.avatar ?? null);
      setInitialise(true);
    }
  }, [user, initialise]);

  const modifie = nom.trim() !== (user?.name ?? "") || avatar !== (user?.avatar ?? null);
  const valide = nom.trim().length >= 2;
  const peutValider = modifie && valide && !envoi;

  const choisirPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErreur("Autorisez l'accès aux photos pour changer votre image.");
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (!r.canceled && r.assets?.[0]?.base64) {
        setErreur(null);
        setAvatar(`data:image/jpeg;base64,${r.assets[0].base64}`);
      }
    } catch {
      setErreur("Impossible de charger la photo. Réessayez.");
    }
  };

  const enregistrer = async () => {
    if (!token || !peutValider) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await apiFetch(
        "/api/auth/me",
        { method: "PATCH", body: JSON.stringify({ name: nom.trim(), avatar }) },
        token,
      );
      await refreshUser();
      router.back();
    } catch (e: any) {
      setErreur(e?.message || "Enregistrement impossible. Réessayez.");
      setEnvoi(false);
    }
  };

  const initiale = (nom || "?").charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="profil-edit-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <EnTeteSombre
            titre="Mon profil"
            retour={() => router.back()}
            retourTestID="profil-edit-back"
          />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.avatarZone}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={avatar ? "Changer ma photo de profil" : "Ajouter une photo de profil"}
                onPress={choisirPhoto}
                testID="profil-avatar-btn"
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} alt="Votre photo de profil" />
                ) : (
                  <View style={[styles.avatar, styles.avatarVide, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.initiale, { color: colors.textInverse }]}>{initiale}</Text>
                  </View>
                )}
                <View style={[styles.badgePhoto, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="camera-outline" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarAide, { color: colors.textSecondary }]}>
                Touchez pour {avatar ? "changer" : "ajouter"} votre photo
              </Text>
              {avatar && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Retirer ma photo de profil"
                  onPress={() => setAvatar(null)}
                  testID="profil-avatar-remove"
                >
                  <Text style={[styles.retirer, { color: colors.error }]}>Retirer la photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Nom affiché</Text>
            <Glass borderRadius={radius.md} style={styles.champWrap}>
              <TextInput
                value={nom}
                onChangeText={setNom}
                placeholder="Comment les voisins vous voient"
                placeholderTextColor={colors.textTertiary}
                style={[styles.champ, { color: colors.textPrimary }]}
                maxLength={60}
                testID="profil-nom"
              />
            </Glass>
            {!valide && nom.length > 0 && (
              <Text style={[styles.aide, { color: colors.error }]}>
                Le nom doit comporter au moins 2 caractères.
              </Text>
            )}

            <View style={[styles.info, { backgroundColor: colors.surface2 }]}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.secondary} />
              <Text style={[styles.infoTxt, { color: colors.textSecondary }]}>
                Votre email et votre téléphone ne sont pas modifiables : ce sont eux qui
                attestent que votre contact est vérifié.
              </Text>
            </View>

            {erreur && (
              <Text style={[styles.erreur, { color: colors.error }]} testID="profil-erreur">
                {erreur}
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !peutValider }}
              onPress={enregistrer}
              disabled={!peutValider}
              testID="profil-submit"
              style={[
                styles.submit,
                { backgroundColor: peutValider ? colors.primary : colors.surface2 },
                peutValider
                  ? shadowStyle({ color: colors.primary, opacity: 0.4, radius: 18, offsetY: 8 })
                  : null,
              ]}
            >
              {envoi ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text
                  style={[
                    styles.submitTxt,
                    { color: peutValider ? colors.textInverse : colors.textTertiary },
                  ]}
                >
                  {modifie ? "Enregistrer" : "Aucune modification"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  avatarZone: { alignItems: "center", gap: 8, marginBottom: spacing.lg },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarVide: { alignItems: "center", justifyContent: "center" },
  initiale: { fontSize: 40, fontWeight: "600" },
  badgePhoto: {
    position: "absolute", right: -2, bottom: -2, width: 34, height: 34,
    borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  avatarAide: { fontSize: 13 },
  retirer: { fontSize: 13, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: spacing.sm },
  champWrap: { paddingHorizontal: 14, paddingVertical: 4 },
  champ: { fontSize: 16, paddingVertical: 12 },
  aide: { fontSize: 12, marginTop: 6 },
  info: {
    flexDirection: "row", alignItems: "flex-start", gap: 9,
    padding: 12, borderRadius: radius.md, marginTop: spacing.lg,
  },
  infoTxt: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  erreur: { fontSize: 13, fontWeight: "700", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  submit: { paddingVertical: 17, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  submitTxt: { fontSize: 16, fontWeight: "600" },
});
