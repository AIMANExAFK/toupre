// Web stub for Map component (react-native-maps not supported on web)
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "./theme";

type LatLng = { latitude: number; longitude: number };

export type MapItem = {
  id: string;
  coordinate: LatLng;
  title?: string;
  description?: string;
  onPress?: () => void;
};

export function Map({
  items,
  style,
}: {
  initialCenter: LatLng;
  items: MapItem[];
  style?: any;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.head}>
        <Ionicons name="map" size={18} color={colors.primary} />
        <Text style={[styles.headText, { color: colors.textPrimary }]}>
          Carte ({items.length})
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
        {items.slice(0, 30).map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={m.onPress}
            style={[
              styles.pin,
              {
                backgroundColor: colors.primaryTint,
                borderColor: colors.primaryGlow,
              },
            ]}
          >
            <Ionicons name="location" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pinTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {m.title}
              </Text>
              {m.description && (
                <Text style={[styles.pinDesc, { color: colors.textSecondary }]}>
                  {m.description}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(124,58,237,0.2)",
  },
  headText: { fontSize: 14, fontWeight: "700" },
  pin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pinTitle: { fontSize: 14, fontWeight: "600" },
  pinDesc: { fontSize: 12, marginTop: 2 },
});
