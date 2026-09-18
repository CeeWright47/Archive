import { StyleSheet, Text } from "react-native";

import { theme } from "@/theme/tokens";

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children.toUpperCase()}</Text>;
}

export function HelperText({ children }: { children: string }) {
  return (
    <Text style={styles.helper} numberOfLines={2}>
      {children}
    </Text>
  );
}

export function ErrorText({ children }: { children: string }) {
  return (
    <Text style={styles.error} numberOfLines={2}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.textMuted,
    textAlign: "left",
    marginBottom: theme.spacing.xs,
  },
  helper: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "left",
  },
  error: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.danger,
    textAlign: "left",
    marginTop: theme.spacing.xxs,
  },
});
