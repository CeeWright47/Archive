import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { theme } from "@/theme/tokens";

const PULSE_DURATION_MS = 800;
const CARD_COUNT = 6;

interface SkeletonGridProps {
  /** Image aspect ratio of the real cards this stands in for. */
  aspectRatio?: number;
  /** Placeholder text bars under each image (0 for image-only grids). */
  textLines?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-column placeholder grid shown while a tab's first fetch is in flight,
 * so the empty state only appears once the fetch has actually come back empty.
 */
export function SkeletonGrid({
  aspectRatio = 3 / 4,
  textLines = 2,
  style,
}: SkeletonGridProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.5, { duration: PULSE_DURATION_MS }),
      -1,
      true,
    );
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const rows = Array.from({ length: CARD_COUNT / 2 }, (_, row) => row);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[styles.grid, pulseStyle, style]}
    >
      {rows.map((row) => (
        <View key={row} style={styles.row}>
          {[0, 1].map((col) => (
            <View key={col} style={styles.card}>
              <View style={[styles.block, styles.image, { aspectRatio }]} />
              {Array.from({ length: textLines }, (_, line) => (
                <View
                  key={line}
                  style={[
                    styles.block,
                    styles.line,
                    line === 0 ? styles.lineShort : styles.lineLong,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  card: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  block: {
    backgroundColor: theme.colors.backgroundElevated,
  },
  image: {
    width: "100%",
    borderRadius: theme.radii.md,
  },
  line: {
    height: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  lineShort: {
    width: "40%",
  },
  lineLong: {
    width: "80%",
  },
});
