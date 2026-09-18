import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

export const STARTUP_TIPS = [
  "Shoot pieces on a hanger against a plain door — the AI reads color and material better.",
  "Tag the pieces in your outfit photos. It's how Archive learns what you actually wear, not just what you own.",
  "Scan something in the store before you buy it. Archive checks it against what's already in your closet.",
  "Add inspo images even if you don't own anything like them. They tell Archive where your style is heading.",
  "Set your fit preferences in Profile — it changes what Archive suggests, not just what it notices.",
  "Run the assessment once you've catalogued 30 or so pieces. Earlier than that and it's guessing.",
  "Insights finds the gaps between what you own and what you keep reaching for.",
] as const;

const TIP = STARTUP_TIPS[Math.floor(Math.random() * STARTUP_TIPS.length)];
const BAR_WIDTH = 200;

export function ArchiveLoadingScreen({
  progress = null,
  showTip = true,
}: {
  progress?: number | null;
  showTip?: boolean;
}) {
  const mastheadOpacity = useRef(new Animated.Value(0)).current;
  const indeterminate = useRef(new Animated.Value(0)).current;
  const determinate = useRef(new Animated.Value(progress ?? 0)).current;

  useEffect(() => {
    Animated.timing(mastheadOpacity, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mastheadOpacity]);

  useEffect(() => {
    if (progress !== null) return;
    const loop = Animated.loop(
      Animated.timing(indeterminate, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [indeterminate, progress]);

  useEffect(() => {
    if (progress === null) return;
    Animated.timing(determinate, {
      toValue: Math.max(0, Math.min(progress, 1)),
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [determinate, progress]);

  const translateX = indeterminate.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAR_WIDTH * 0.45, BAR_WIDTH],
  });
  const width = determinate.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_WIDTH],
  });

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.masthead, { opacity: mastheadOpacity }]}>
        Archive<Text style={styles.dot}>.</Text>
      </Animated.Text>
      <View style={styles.track}>
        {progress === null ? (
          <Animated.View
            style={[styles.indeterminate, { transform: [{ translateX }] }]}
          />
        ) : (
          <Animated.View style={[styles.progress, { width }]} />
        )}
      </View>
      {showTip ? (
        <View style={styles.tipBlock}>
          <Text style={styles.tipLabel}>TIP</Text>
          <Text style={styles.tip} numberOfLines={2}>
            {TIP}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  masthead: {
    fontFamily: theme.fonts.serif,
    fontSize: 52,
    lineHeight: 60,
    fontWeight: "400",
    color: theme.colors.text,
  },
  dot: { color: theme.colors.accent },
  track: {
    width: BAR_WIDTH,
    height: 4,
    marginTop: theme.spacing.xl,
    overflow: "hidden",
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
  },
  progress: {
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  indeterminate: {
    width: BAR_WIDTH * 0.45,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  tipBlock: {
    width: "100%",
    maxWidth: 340,
    minHeight: 66,
    marginTop: theme.spacing.xl,
    alignItems: "center",
  },
  tipLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
  },
  tip: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
