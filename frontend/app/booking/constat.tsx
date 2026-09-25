import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  TextInput, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";
import { EnTeteSombre } from "../../src/EnTeteSombre";

// État des lieux (spec 001) — écran unique paramétré par la nature du constat.
// Bornes alignées sur le backend : refuser côté client ce que le serveur refusera.
const MAX_PHOTOS = 5;
const PHOTO_QUALITY = 0.4;

type Condition = "ok" | "issue" | "damaged";

const CONDITIONS: { value: Condition; label: string; icon: any }[] = [
  { value: "ok", label: "Conforme", icon: "checkmark-circle-outline" },
  { value: "issue", label: "Problème mineur", icon: "alert-circle-outline" },
  { value: "damaged", label: "Dégradé", icon: "close-circle-outline" },
];

export default function Constat() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: string }>();
  const isReturn = kind === "return";
  const { token } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [photos, setPhotos] = useState<string[]>([]);
  const [condition, setCondition] = useState<Condition>("ok");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noteRequired = isReturn && condition !== "ok";
  const canSubmit =
    photos.length > 0 && (!noteRequired || notes.trim().length > 0) && !sending;

  const addPhoto = async (fromCamera: boolean) => {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      let result;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          // FR-009 : l'accès refusé ne bloque pas le parcours, on bascule sur la galerie.
          setError("Accès à l'appareil photo refusé. Choisissez une image existante.");
          return addPhoto(false);
        }
        result = await ImagePicker.launchCameraAsync({
          quality: PHOTO_QUALITY,
          base64: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError("Autorisez l'accès aux photos pour ajouter un constat.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: PHOTO_QUALITY,
          base64: true,
        });
      }
      if (!result.canceled && result.assets?.[0]?.base64) {
        setError(null);
        setPhotos((p) => [...p, `data:image/jpeg;base64,${result.assets[0].base64}`]);
      }
    } catch (e: any) {
      setError("Impossible d'ajouter la photo. Réessayez.");
    }
  };

  const onAdd = () => {
    // Sur le web l'appareil photo n'est pas proposé : on va directement à la galerie.
    if (Platform.OS === "web") return addPhoto(false);
    Alert.alert("Ajouter une photo", undefined, [
      { text: "Prendre une photo", onPress: () => addPhoto(true) },
      { text: "Choisir une image", onPress: () => addPhoto(false) },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, k) => k !== i));

  const submit = async () => {
    if (!token || !canSubmit) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(
        `/api/bookings/${id}/inspection`,
        {
          method: "POST",
          body: JSON.stringify({
            kind: isReturn ? "return" : "pickup",
            condition: isReturn ? condition : "ok",
            notes: notes.trim(),
            photos,
          }),
        },
        token,
      );
      // replace (et non back) : l'écran peut être ouvert directement par URL ou
      // depuis une notification, sans pile d'historique — back() laisserait
      // l'utilisateur bloqué sur le constat qu'il vient pourtant de valider.
      router.replace("/(tabs)/bookings");
    } catch (e: any) {
      // T009 : on conserve les photos saisies pour permettre une nouvelle tentative
      // sans tout recommencer (réseau dégradé au moment de la remise).
      if (e?.status === 409) {
        setError("Un constat a déjà été déposé pour cette étape.");
      } else {
        setError(e?.message || "Envoi impossible. Vérifiez votre connexion et réessayez.");
      }
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="constat-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <EnTeteSombre
            titre={<>{isReturn ? "Constat de retour" : "Constat de remise"}</>}
            retour={() => router.back()}
            retourTestID="constat-back"
          />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              {isReturn
                ? "Photographiez l'objet tel que vous le rendez. Ce constat protège les deux parties."
                : "Photographiez l'objet tel que vous le recevez. En cas de désaccord plus tard, c'est cette preuve qui fait foi."}
            </Text>

            {/* Photos */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Photos <Text style={{ color: colors.primary }}>*</Text>
              <Text style={[styles.count, { color: colors.textTertiary }]}>
                {"  "}{photos.length}/{MAX_PHOTOS}
              </Text>
            </Text>
            <View style={styles.photoRow}>
              {photos.map((p, i) => (
                <View key={i} style={styles.thumbWrap}>
                  <Image source={{ uri: p }} style={styles.thumb} alt={`Photo ${i + 1} du constat`} />
                  <TouchableOpacity accessibilityRole="button"
                    onPress={() => removePhoto(i)}
                    style={[styles.removeBtn, { backgroundColor: colors.error }]}
                    testID={`remove-photo-${i}`}
                    accessibilityLabel={`Supprimer la photo ${i + 1}`}
                  >
                    <Ionicons name="close" size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity accessibilityRole="button"
                  onPress={onAdd}
                  style={[styles.addBtn, { borderColor: colors.primary }]}
                  testID="add-photo"
                  accessibilityLabel="Ajouter une photo"
                >
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  <Text style={[styles.addTxt, { color: colors.primary }]}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* État constaté — uniquement au retour */}
            {isReturn && (
              <>
                <Text style={[styles.label, { color: colors.textPrimary, marginTop: spacing.lg }]}>
                  État constaté
                </Text>
                <View style={styles.condRow}>
                  {CONDITIONS.map((c) => {
                    const active = condition === c.value;
                    return (
                      <TouchableOpacity accessibilityRole="button"
                        key={c.value}
                        onPress={() => setCondition(c.value)}
                        testID={`condition-${c.value}`}
                        style={[
                          styles.condPill,
                          {
                            backgroundColor: active ? colors.primary : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={c.icon}
                          size={15}
                          color={active ? colors.textInverse : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.condTxt,
                            { color: active ? colors.textInverse : colors.textSecondary },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Note */}
            <Text style={[styles.label, { color: colors.textPrimary, marginTop: spacing.lg }]}>
              Note {noteRequired ? <Text style={{ color: colors.primary }}>*</Text> : null}
              {!noteRequired && (
                <Text style={[styles.count, { color: colors.textTertiary }]}>  facultative</Text>
              )}
            </Text>
            <Glass borderRadius={radius.md} style={styles.noteWrap}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder={
                  noteRequired
                    ? "Décrivez le problème constaté"
                    : "Rayure déjà présente, plein fait, accessoires inclus…"
                }
                placeholderTextColor={colors.textTertiary}
                style={[styles.note, { color: colors.textPrimary }]}
                testID="constat-notes"
              />
            </Glass>
            {noteRequired && (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Une explication est obligatoire lorsqu'un problème est signalé.
              </Text>
            )}

            {/* Avertissement — FR-010 */}
            <View style={[styles.warn, { backgroundColor: colors.warningBg }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.warning} />
              <Text style={[styles.warnTxt, { color: colors.warning }]}>
                Une fois validé, ce constat est définitif et visible par l'autre partie.
              </Text>
            </View>

            {error && (
              <Text style={[styles.error, { color: colors.error }]} testID="constat-error">
                {error}
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity accessibilityRole="button"
              onPress={submit}
              disabled={!canSubmit} accessibilityState={{ disabled: !canSubmit }}
              testID="constat-submit"
              style={[
                styles.submit,
                { backgroundColor: canSubmit ? colors.primary : colors.surface2 },
                canSubmit
                  ? shadowStyle({ color: colors.primary, opacity: 0.4, radius: 18, offsetY: 8 })
                  : null,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text
                  style={[
                    styles.submitTxt,
                    { color: canSubmit ? colors.textInverse : colors.textTertiary },
                  ]}
                >
                  {/* Le libellé dit toujours ce qui manque : un bouton grisé sans
                      explication laisse l'utilisateur bloqué sans savoir pourquoi. */}
                  {photos.length === 0
                    ? "Ajoutez au moins une photo"
                    : noteRequired && notes.trim().length === 0
                      ? "Ajoutez une explication"
                      : isReturn
                        ? "Valider le retour"
                        : "Valider la remise"}
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
  intro: { fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: "600", marginBottom: spacing.sm },
  count: { fontSize: 12, fontWeight: "600" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbWrap: { position: "relative" },
  thumb: { width: 88, height: 88, borderRadius: radius.md },
  removeBtn: {
    position: "absolute", top: -6, right: -6, width: 22, height: 22,
    borderRadius: 11, alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 88, height: 88, borderRadius: radius.md, borderWidth: 1.5,
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 3,
  },
  addTxt: { fontSize: 11, fontWeight: "700" },
  condRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  condPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1,
  },
  condTxt: { fontSize: 13, fontWeight: "700" },
  noteWrap: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 84 },
  note: { fontSize: 15, minHeight: 64, textAlignVertical: "top" },
  hint: { fontSize: 12, marginTop: 6 },
  warn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: radius.md, marginTop: spacing.lg,
  },
  warnTxt: { flex: 1, fontSize: 12.5, fontWeight: "700", lineHeight: 18 },
  error: { fontSize: 13, fontWeight: "700", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  submit: {
    paddingVertical: 17, borderRadius: 999,
    alignItems: "center", justifyContent: "center",
  },
  submitTxt: { fontSize: 16, fontWeight: "600" },
});
