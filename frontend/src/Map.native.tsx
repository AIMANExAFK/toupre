// Native (iOS/Android) Map component using react-native-maps
import React from "react";
import { StyleSheet, View } from "react-native";
import RNMaps, { Marker } from "react-native-maps";

type LatLng = { latitude: number; longitude: number };

export type MapItem = {
  id: string;
  coordinate: LatLng;
  title?: string;
  description?: string;
  onPress?: () => void;
};

export function Map({
  initialCenter,
  items,
  style,
}: {
  initialCenter: LatLng;
  items: MapItem[];
  style?: any;
}) {
  return (
    <View style={[styles.box, style]}>
      <RNMaps
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          ...initialCenter,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {items.map((m) => (
          <Marker
            key={m.id}
            coordinate={m.coordinate}
            title={m.title}
            description={m.description}
            onCalloutPress={m.onPress}
          />
        ))}
      </RNMaps>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
});
