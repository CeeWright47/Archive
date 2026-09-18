import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { theme } from "@/theme/tokens";

interface CategoryChipsProps<T extends string> {
  categories: readonly T[];
  selected: T | null;
  onSelect: (category: T | null) => void;
  /** Per-option counts shown after the label; `all` is used for the "All" chip. */
  counts?: { all: number; byOption: ReadonlyMap<T, number> };
  compact?: boolean;
}

export function CategoryChips<T extends string>({
  categories,
  selected,
  onSelect,
  counts,
  compact = false,
}: CategoryChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[
        styles.row,
        compact && styles.rowCompact,
        styles.rowAlign,
      ]}
    >
      <FilterChip
        label="All"
        count={counts?.all}
        active={selected === null}
        onPress={() => onSelect(null)}
      />
      {categories.map((category) => (
        <FilterChip
          key={category}
          label={category}
          count={counts?.byOption.get(category)}
          active={selected === category}
          onPress={() => onSelect(category)}
        />
      ))}
    </ScrollView>
  );
}

export function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text
        selectable={false}
        style={[styles.chipLabel, active && styles.chipLabelActive]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text
          selectable={false}
          style={[styles.chipCount, active && styles.chipCountActive]}
        >
          {count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView next to a FlatList otherwise flex-shrinks to ~0 height.
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rowCompact: {
    paddingTop: 0,
  },
  rowAlign: {
    alignItems: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
  },
  chipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipLabel: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    userSelect: "none",
  },
  chipLabelActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
  chipCount: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    userSelect: "none",
  },
  chipCountActive: {
    color: theme.colors.background,
  },
});
