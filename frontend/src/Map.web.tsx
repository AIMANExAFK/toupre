import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, radius } from "./theme";
import { compte } from "./francais";

type LatLng = { latitude: number; longitude: number };

export type MapItem = {
  id: string;
  coordinate: LatLng;
  title?: string;
  description?: string;
  onPress?: () => void;
};

type LeafletMap = {
  remove: () => void;
  setView: (center: [number, number], zoom: number) => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string) => LeafletMarker;
  on: (event: string, handler: () => void) => LeafletMarker;
};

type LeafletApi = {
  map: (element: HTMLElement, options?: unknown) => LeafletMap;
  tileLayer: (url: string, options?: unknown) => { addTo: (map: LeafletMap) => void };
  marker: (position: [number, number], options?: unknown) => LeafletMarker;
  divIcon: (options?: unknown) => unknown;
  LatLngBounds: new (points: [number, number][]) => { pad: (amount: number) => unknown };
};

declare global {
  interface Window {
    L?: LeafletApi;
    __locaShareLeafletLoading?: Promise<LeafletApi>;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export function Map({
  initialCenter,
  items,
  style,
}: {
  initialCenter: LatLng;
  items: MapItem[];
  style?: any;
}) {
  const colors = useColors();
  const containerRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const center = useMemo<[number, number]>(() => {
    if (!items.length) return [initialCenter.latitude, initialCenter.longitude];
    const lat = items.reduce((sum, item) => sum + item.coordinate.latitude, 0) / items.length;
    const lng = items.reduce((sum, item) => sum + item.coordinate.longitude, 0) / items.length;
    return [lat, lng];
  }, [initialCenter.latitude, initialCenter.longitude, items]);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    loadLeaflet()
      .then((leaflet) => {
        if (!mounted || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        const map = leaflet.map(containerRef.current, {
          center,
          zoom: items.length > 1 ? 12 : 14,
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
        });

        leaflet
          .tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap &copy; CARTO",
          })
          .addTo(map);

        const bounds: [number, number][] = [];
        items.forEach((item) => {
          const position: [number, number] = [item.coordinate.latitude, item.coordinate.longitude];
          bounds.push(position);
          leaflet
            .marker(position, {
              icon: leaflet.divIcon({
                className: "locashare-map-pin",
                html: `<span>${escapeHtml(item.description || "")}</span>`,
                iconSize: [42, 42],
                iconAnchor: [21, 42],
              }),
            })
            .addTo(map)
            .bindPopup(popupHtml(item))
            .on("click", () => item.onPress?.());
        });

        if (bounds.length > 1) {
          map.fitBounds(new leaflet.LatLngBounds(bounds).pad(0.2), { maxZoom: 13 });
        } else {
          map.setView(center, 14);
        }

        mapRef.current = map;
        setReady(true);
        cleanup = () => {
          map.remove();
          mapRef.current = null;
        };
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [center, items]);

  if (failed) {
    return <MapFallback colors={colors} items={items} style={style} />;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface2, borderColor: colors.border }, style]}>
      {React.createElement("div", {
        ref: containerRef,
        style: styles.webMap,
      })}

      {!ready && (
        <View style={[styles.loading, { backgroundColor: colors.surface2 }]}>
          <Ionicons name="map-outline" size={22} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de la carte...</Text>
        </View>
      )}

      {ready && (
        <View pointerEvents="none" style={[styles.mapBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="navigate-outline" size={15} color={colors.primary} />
          <Text style={[styles.mapBadgeText, { color: colors.textPrimary }]}>
            {compte(items.length, "bien")}
          </Text>
        </View>
      )}
    </View>
  );
}

function MapFallback({ colors, items, style }: { colors: any; items: MapItem[]; style?: any }) {
  return (
    <View style={[styles.wrap, styles.fallback, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={styles.fallbackHeader}>
        <Ionicons name="map" size={18} color={colors.primary} />
        <Text style={[styles.fallbackTitle, { color: colors.textPrimary }]}>Carte indisponible</Text>
      </View>
      <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
        Vérifiez votre connexion, puis rechargez la page. Les biens restent accessibles ci-dessous.
      </Text>
      {items.slice(0, 4).map((item) => (
        <Pressable accessibilityRole="button" key={item.id} onPress={item.onPress} style={[styles.fallbackRow, { borderColor: colors.border }]}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.fallbackItem, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__locaShareLeafletLoading) return window.__locaShareLeafletLoading;

  window.__locaShareLeafletLoading = new Promise<LeafletApi>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if (!document.querySelector("style[data-locashare-map]")) {
      const style = document.createElement("style");
      style.dataset.locashareMap = "true";
      style.textContent = `
        .locashare-map-pin {
          width: 42px !important;
          height: 42px !important;
          border-radius: 21px 21px 21px 5px;
          background: #55e6d3;
          border: 3px solid #050b09;
          box-shadow: 0 0 0 3px rgba(85,230,211,.2), 0 12px 28px rgba(0,0,0,.72);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .locashare-map-pin span {
          transform: rotate(45deg);
          color: #08211c;
          font: 800 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          max-width: 28px;
          overflow: hidden;
          white-space: nowrap;
        }
        .leaflet-container {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #030706;
          color: #eaf8f3;
        }
        .leaflet-control-zoom a,
        .leaflet-control-attribution {
          background: rgba(5, 11, 9, .88) !important;
          color: #dff8f1 !important;
          border-color: rgba(85, 230, 211, .18) !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(85, 230, 211, .18) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,.45) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #0e1b17 !important;
        }
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: #07100d;
          color: #eefbf7;
          border: 1px solid rgba(85, 230, 211, .22);
          box-shadow: 0 16px 36px rgba(0,0,0,.5);
        }
        .leaflet-popup-content span {
          color: #9fb1aa;
        }
      `;
      document.head.appendChild(style);
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet unavailable")));
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });

  return window.__locaShareLeafletLoading;
}

function popupHtml(item: MapItem) {
  return `
    <strong>${escapeHtml(item.title || "Bien disponible")}</strong>
    ${item.description ? `<br/><span>${escapeHtml(item.description)}</span>` : ""}
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  webMap: {
    width: "100%",
    height: "100%",
    minHeight: 420,
    zIndex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { fontSize: 13, fontWeight: "700" },
  mapBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 3,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapBadgeText: { fontSize: 12, fontWeight: "900" },
  fallback: {
    padding: 14,
    gap: 10,
  },
  fallbackHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fallbackTitle: { fontSize: 14, fontWeight: "900" },
  fallbackText: { fontSize: 12, lineHeight: 18 },
  fallbackRow: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fallbackItem: { flex: 1, fontSize: 12, fontWeight: "800" },
});
