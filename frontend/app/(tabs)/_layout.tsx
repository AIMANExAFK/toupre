import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, StyleSheet } from "react-native";
import { useColors, shadowStyle } from "../../src/theme";
import { Glass } from "../../src/Glass";

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        sceneStyle: { backgroundColor: colors.bg } as any,
        tabBarBackground: () => (
          <Glass
            borderRadius={0}
            style={StyleSheet.absoluteFillObject}
          />
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 90 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
          position: "absolute",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explorer",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={22} color={color} />
          ),
          tabBarTestID: "tab-explore",
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Locations",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
          tabBarTestID: "tab-bookings",
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Publier",
          tabBarIcon: () => (
            <View
              style={[
                styles.fab,
                { backgroundColor: colors.primary },
                shadowStyle({ color: colors.primary, opacity: 0.55, radius: 16, offsetY: 6 }),
              ]}
            >
              <Ionicons name="add" size={28} color={colors.textInverse} />
            </View>
          ),
          tabBarLabel: () => null,
          tabBarTestID: "tab-create",
        }}
      />
      <Tabs.Screen
        name="myitems"
        options={{
          title: "Mes biens",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
          tabBarTestID: "tab-myitems",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
          tabBarTestID: "tab-profile",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
  },
});
