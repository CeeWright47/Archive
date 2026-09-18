import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { useSaveStatus } from "@/hooks/useAutosave";
import { theme } from "@/theme/tokens";

const FADE_MS = 200;
const HOLD_MS = 1000;

// Header-right "Saved" flash; fades in on each successful write and out ~1s later.
export function SavedIndicator() {
  const { savedAt } = useSaveStatus();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (savedAt === null) return;
    opacity.stopAnimation();
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [savedAt, opacity]);

  return (
    <Animated.Text
      style={[styles.text, { opacity }]}
      accessibilityLiveRegion="polite"
    >
      Saved
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.md,
  },
});
