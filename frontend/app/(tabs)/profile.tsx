import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { colors, spacing, radius, shadows } from "../../src/theme";

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.guestBox}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textTertiary} />
          <Text style={styles.guestTitle}>Pas encore de compte ?</Text>
          <Text style={styles.guestSub}>Connectez-vous pour louer ou publier des annonces</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push("/(auth)/login")}
            testID="profile-login-btn"
          >
            <Text style={styles.btnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initial = user.name?.charAt(0).toUpperCase() || "U";

  return (
    <SafeAreaView style={styles.container} testID="profile-screen" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name} testID="profile-name">
            {user.name}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Locations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Annonces</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>5.0</Text>
            <Text style={styles.statLabel}>★ Note</Text>
          </View>
        </View>

        <View style={styles.menu}>
          <MenuItem icon="calendar-outline" label="Mes locations" onPress={() => router.push("/(tabs)/bookings")} testID="menu-bookings" />
          <MenuItem icon="cube-outline" label="Mes annonces" onPress={() => router.push("/(tabs)/myitems")} testID="menu-listings" />
          <MenuItem icon="add-circle-outline" label="Publier une annonce" onPress={() => router.push("/(tabs)/create")} testID="menu-create" />
          <MenuItem icon="card-outline" label="Paiements" onPress={() => {}} testID="menu-payments" />
          <MenuItem icon="settings-outline" label="Paramètres" onPress={() => {}} testID="menu-settings" />
          <MenuItem icon="help-circle-outline" label="Aide & support" onPress={() => {}} testID="menu-help" />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="logout-btn">
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} testID={testID}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: "center", padding: spacing.xl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  avatarText: { color: colors.surface, fontSize: 34, fontWeight: "700" },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.md,
    letterSpacing: -0.3,
  },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  menu: { marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.errorBg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  logoutText: { color: colors.error, fontWeight: "600", fontSize: 15 },
  guestBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 8 },
  guestTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginTop: 12 },
  guestSub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 16 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.md, ...shadows.primary },
  btnText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
});
