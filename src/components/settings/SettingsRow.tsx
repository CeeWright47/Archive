import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

const ROW_MIN_HEIGHT = 56;
const DISABLED_OPACITY = 0.45;

interface SettingsRowProps {
  label: string;
  description?: string;
  summary?: string;
  onPress?: () => void;
  /** Inline control (toggle, segmented picker) rendered in place of the summary/chevron. */
  accessory?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export function SettingsRow({
  label,
  description,
  summary,
  onPress,
  accessory,
  destructive = false,
  disabled = false,
}: SettingsRowProps) {
  const pushes = Boolean(onPress) && !accessory;
  const labelColor = destructive ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.textColumn}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      {accessory ? (
        <View style={styles.accessory}>{accessory}</View>
      ) : (
        <View style={styles.trailing}>
          {summary ? (
            <Text style={styles.summary} numberOfLines={1} ellipsizeMode="tail">
              {summary}
            </Text>
          ) : null}
          {pushes && (
            <Ionicons
              name="chevron-forward"
              size={theme.spacing.md}
              color={theme.colors.textMuted}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  rowPressed: {
    backgroundColor: theme.colors.border,
  },
  rowDisabled: {
    opacity: DISABLED_OPACITY,
  },
  textColumn: {
    flex: 1,
    alignItems: "flex-start",
    gap: 2,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    textAlign: "left",
  },
  description: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "left",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
    maxWidth: "45%",
  },
  summary: {
    flexShrink: 1,
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "right",
  },
  accessory: {
    alignItems: "flex-end",
  },
});
