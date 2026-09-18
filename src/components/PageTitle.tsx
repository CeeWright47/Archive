import { StyleSheet, Text } from "react-native";

import { theme } from "@/theme/tokens";

// The one page-title treatment every (tabs) screen should use: a persistent,
// left-aligned serif heading, always rendered regardless of empty state.
export function PageTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    lineHeight: theme.typography.title2.lineHeight,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.text,
  },
});
