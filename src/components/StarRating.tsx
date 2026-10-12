import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { theme } from "@/theme/tokens";

const STAR_COUNT = 5;

interface StarRatingProps {
  value: number | null;
  /** Omit to render a read-only display. */
  onChange?: (value: number | null) => void;
  size?: number;
}

// Tapping the already-selected star clears the rating (null = not yet rated).
export function StarRating({ value, onChange, size }: StarRatingProps) {
  const filled = value ?? 0;
  const starSize = size ?? theme.spacing.lg;

  return (
    <View style={styles.row}>
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const starValue = index + 1;
        const icon = starValue <= filled ? "star" : "star-outline";
        const color =
          starValue <= filled ? theme.colors.accent : theme.colors.textMuted;

        if (!onChange) {
          return (
            <Ionicons
              key={starValue}
              name={icon}
              size={starSize}
              color={color}
            />
          );
        }

        return (
          <Pressable
            key={starValue}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${starValue} star${starValue === 1 ? "" : "s"}`}
            hitSlop={theme.spacing.xxs}
            onPress={() => onChange(starValue === value ? null : starValue)}
          >
            <Ionicons name={icon} size={starSize} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: theme.spacing.xxs,
  },
});
