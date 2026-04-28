import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useColors, spacing, radius, ThemeMode } from "../src/theme";
import { Glass, GradientBg } from "../src/Glass";

export default function Settings() {
  const router = useRouter();
  const colors = useColors();
  const { mode, setMode, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="settings-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} testID="settings-back">
              <Glass borderRadius={22} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Glass>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Paramètres</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.section, { color: colors.textSecondary }]}>APPARENCE</Text>
            <Glass borderRadius={radius.lg}>
              <ThemeRow label="Clair" value="light" current={mode} onSelect={setMode} icon="sunny-outline" colors={colors} />
              <Divider colors={colors} />
              <ThemeRow label="Sombre" value="dark" current={mode} onSelect={setMode} icon="moon-outline" colors={colors} />
              <Divider colors={colors} />
              <ThemeRow label="Système" value="system" current={mode} onSelect={setMode} icon="phone-portrait-outline" colors={colors} />
            </Glass>

            <Text style={[styles.section, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
            <Glass borderRadius={radius.lg}>
              <ToggleRow label="Notifications push" icon="notifications-outline" defaultOn colors={colors} />
              <Divider colors={colors} />
              <ToggleRow label="Emails marketing" icon="mail-outline" defaultOn={false} colors={colors} />
              <Divider colors={colors} />
              <ToggleRow label="Rappels de réservation" icon="alarm-outline" defaultOn colors={colors} />
            </Glass>

            <Text style={[styles.section, { color: colors.textSecondary }]}>CONFIDENTIALITÉ</Text>
            <Glass borderRadius={radius.lg}>
              <LinkRow label="Politique de confidentialité" icon="shield-outline" colors={colors} onPress={() => Alert.alert("Confidentialité", "Vos données sont chiffrées et ne sont jamais revendues.")} />
              <Divider colors={colors} />
              <LinkRow label="Conditions d'utilisation" icon="document-text-outline" colors={colors} onPress={() => Alert.alert("Conditions", "Consultez les CGU sur locashare.fr/cgu")} />
              <Divider colors={colors} />
              <LinkRow label="Gérer mes données" icon="lock-closed-outline" colors={colors} onPress={() => Alert.alert("Données", "Téléchargement de données disponible sur demande.")} />
            </Glass>

            <Text style={[styles.section, { color: colors.textSecondary }]}>À PROPOS</Text>
            <Glass borderRadius={radius.lg}>
              <LinkRow label="Version" icon="information-circle-outline" colors={colors} value="1.0.0" />
              <Divider colors={colors} />
              <LinkRow label="Évaluer LocaShare" icon="star-outline" colors={colors} onPress={() => Alert.alert("Merci !", "Votre avis compte beaucoup pour nous.")} />
            </Glass>
          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function ThemeRow({ label, value, current, onSelect, icon, colors }: any) {
  const active = current === value;
  return (
    <TouchableOpacity style={styles.row} onPress={() => onSelect(value as ThemeMode)} testID={`theme-${value}`}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {active ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : (
        <View style={[styles.radio, { borderColor: colors.border }]} />
      )}
    </TouchableOpacity>
  );
}

function ToggleRow({ label, icon, defaultOn, colors }: any) {
  const [on, setOn] = require("react").useState(defaultOn);
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch value={on} onValueChange={setOn} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
    </View>
  );
}

function LinkRow({ label, icon, colors, onPress, value }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {value ? (
        <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
});
