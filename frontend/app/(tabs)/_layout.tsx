import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, StyleSheet } from "react-native";
import { useTheme, shadowStyle } from "../../src/theme";

// Barre d'onglets « Slate » : une pilule d'encre qui flotte au-dessus du
// contenu, icônes seules ; l'onglet actif est posé dans un rond clair.
// Les intitulés ne sont plus affichés mais restent annoncés aux lecteurs
// d'écran (tabBarAccessibilityLabel) — sans eux, les boutons seraient muets.

type NomIcone = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const { colors } = useTheme();
  // Comme dans Slate : pilule noire, icônes grises, onglet actif dans un rond
  // blanc avec l'icône en noir.
  const pilule = colors.ink;
  const actifFond = "#FFFFFF";
  const actifIcone = "#0A0A0A";
  const inactif = "#8A8A8A";

  const icone = (plein: NomIcone, creux: NomIcone) =>
    ({ focused }: { focused: boolean }) => (
      <View style={[styles.rond, focused && { backgroundColor: actifFond }]}>
        <Ionicons name={focused ? plein : creux} size={21} color={focused ? actifIcone : inactif} />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.bg } as any,
        tabBarStyle: {
          backgroundColor: pilule,
          borderTopWidth: 0,
          height: 64,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 6,
          position: "absolute",
          left: 28,
          right: 28,
          bottom: Platform.OS === "ios" ? 24 : 16,
          borderRadius: 999,
          zIndex: 1000,
          elevation: 1000,
          ...shadowStyle({ color: "#2B2420", opacity: 0.28, radius: 22, offsetY: 10 }),
        },
        tabBarItemStyle: { height: 64, alignItems: "center", justifyContent: "center" },
        tabBarIconStyle: { width: 44, height: 44 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explorer",
          tabBarAccessibilityLabel: "Explorer",
          tabBarIcon: icone("compass", "compass-outline"),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Locations",
          tabBarAccessibilityLabel: "Mes locations",
          tabBarIcon: icone("calendar", "calendar-outline"),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Publier",
          tabBarAccessibilityLabel: "Publier une annonce",
          // Slate n'a aucune couleur dans sa barre : « Publier » est une icône
          // parmi les autres.
          tabBarIcon: icone("add-circle", "add-circle-outline"),
        }}
      />
      <Tabs.Screen
        name="myitems"
        options={{
          title: "Mes biens",
          tabBarAccessibilityLabel: "Mes biens",
          tabBarIcon: icone("cube", "cube-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarAccessibilityLabel: "Profil",
          tabBarIcon: icone("person", "person-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  rond: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
