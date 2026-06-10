import { useEffect, useRef } from "react";
import { Animated, View, Dimensions } from "react-native";
import { useColors, spacing, radius } from "./theme";

const { width: SCREEN_W } = Dimensions.get("window");

export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_W, SCREEN_W],
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surface2,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "60%",
          backgroundColor: colors.shimmer,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <SkeletonBox width="100%" height={210} borderRadius={radius.lg} />
      <View style={{ paddingTop: 12, gap: 8, paddingHorizontal: 2 }}>
        <SkeletonBox width="28%" height={12} borderRadius={radius.sm} />
        <SkeletonBox width="75%" height={18} borderRadius={radius.sm} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <SkeletonBox width="50%" height={13} borderRadius={radius.sm} />
          <SkeletonBox width="15%" height={13} borderRadius={radius.sm} />
        </View>
      </View>
    </View>
  );
}
