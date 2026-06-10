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
            borderRadius={8}
            style={StyleSheet.absoluteFillObject}
          />
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: "transparent",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 80 : 64,
          paddingTop: 7,
          paddingBottom: Platform.OS === "ios" ? 24 : 9,
          position: "absolute",
          left: 12,
          right: 12,
          bottom: Platform.OS === "ios" ? 10 : 12,
          borderRadius: 8,
          overflow: "hidden",
          zIndex: 1000,
          elevation: 1000,
          ...shadowStyle({ color: colors.primaryDark, opacity: 0.12, radius: 24, offsetY: 10 }),
        },
        tabBarItemStyle: { overflow: "visible" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explorer",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Locations",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
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
                { backgroundColor: colors.primary, borderColor: colors.surfaceGlassBorder },
                shadowStyle({ color: colors.primary, opacity: 0.38, radius: 18, offsetY: 7 }),
              ]}
            >
              <Ionicons name="add" size={28} color={colors.textInverse} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="myitems"
        options={{
          title: "Mes biens",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -12,
    zIndex: 1001,
    elevation: 1001,
  },
});
