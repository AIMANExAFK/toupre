// Re-export platform-specific Map (Metro picks .web.tsx for web, .native.tsx for ios/android)
export { Map } from "./Map.native";
export type { MapItem } from "./Map.native";
