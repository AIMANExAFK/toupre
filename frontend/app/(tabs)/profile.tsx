import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { useColors, spacing, radius, shadowStyle } from "../../src/theme";
import { Glass, GradientBg } from "../../src/Glass";

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientBg>
          <SafeAreaView style={styles.guestBox}>
            <Glass borderRadius={50} style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person-outline" size={48} color={colors.primary} />
            </Glass>
            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>Pas encore de compte ?</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
              Connectez-vous pour louer ou publier
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.45, radius: 16, offsetY: 6 })]}
              onPress={() => router.push("/(auth)/login")}
              testID="profile-login-btn"
            >
              <Text style={[styles.btnText, { color: colors.textInverse }]}>Se connecter</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </GradientBg>
      </View>
    );
  }

  const initial = user.name?.charAt(0).toUpperCase() || "U";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="profile-screen">
      <GradientBg>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
            <View style={styles.header}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }, shadowStyle({ color: colors.primary, opacity: 0.5, radius: 22, offsetY: 8 })]}>
                <Text style={[styles.avatarText, { color: colors.textInverse }]}>{initial}</Text>
              </View>
              <Text style={[styles.name, { color: colors.textPrimary }]} testID="profile-name">{user.name}</Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
            </View>

            <View style={styles.statsWrap}>
              <Glass borderRadius={radius.lg} style={styles.statsCard}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>0</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Locations</Text>
                </View>
                <View style={[styles.statSep, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>0</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Annonces</Text>
                </View>
                <View style={[styles.statSep, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>5.0</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>★ Note</Text>
                </View>
              </Glass>
            </View>

            <View style={styles.menu}>
              <Glass borderRadius={radius.lg}>
                <MenuItem icon="calendar-outline" label="Mes locations" onPress={() => router.push("/(tabs)/bookings")} testID="menu-bookings" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="cube-outline" label="Mes annonces" onPress={() => router.push("/(tabs)/myitems")} testID="menu-listings" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="add-circle-outline" label="Publier une annonce" onPress={() => router.push("/(tabs)/create")} testID="menu-create" colors={colors} />
              </Glass>
            </View>

            <View style={styles.menu}>
              <Glass borderRadius={radius.lg}>
                <MenuItem icon="card-outline" label="Moyens de paiement" onPress={() => router.push("/payments")} testID="menu-payments" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="settings-outline" label="Paramètres" onPress={() => router.push("/settings")} testID="menu-settings" colors={colors} />
                <Divider colors={colors} />
                <MenuItem icon="help-circle-outline" label="Aide & support" onPress={() => router.push("/help")} testID="menu-help" colors={colors} />
              </Glass>
            </View>

            <TouchableOpacity onPress={onLogout} testID="logout-btn" style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <Glass borderRadius={radius.md} style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.logoutText, { color: colors.error }]}>Se déconnecter</Text>
              </Glass>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </GradientBg>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md }} />;
}

function MenuItem({ icon, label, onPress, testID, colors }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} testID={testID}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", padding: spacing.xl },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, fontWeight: "800" },
  name: { fontSize: 24, fontWeight: "800", marginTop: spacing.md, letterSpacing: -0.4 },
  email: { fontSize: 14, marginTop: 2 },
  statsWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  statsCard: { flexDirection: "row", padding: spacing.md, alignItems: "center" },
  statBox: { flex: 1, alignItems: "center" },
  statSep: { width: 1, height: 32 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  menu: { marginTop: spacing.lg, marginHorizontal: spacing.lg },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 14, gap: spacing.md },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  logoutText: { fontWeight: "700", fontSize: 15 },
  guestBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 8 },
  guestTitle: { fontSize: 22, fontWeight: "800", marginTop: 16 },
  guestSub: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.md, marginTop: 8 },
  btnText: { fontWeight: "700", fontSize: 15 },
});
