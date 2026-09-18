import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

// Tracked mono caption used above each settings group. Left-aligned by design (spec §2).
export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    alignItems: "flex-start",
  },
  text: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
    textAlign: "left",
  },
});
