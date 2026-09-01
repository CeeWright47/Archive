import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { theme } from "@/theme/tokens";

interface CategoryChipsProps<T extends string> {
  categories: readonly T[];
  selected: T | null;
  onSelect: (category: T | null) => void;
}

export function CategoryChips<T extends string>({
  categories,
  selected,
  onSelect,
}: CategoryChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, styles.rowAlign]}
    >
      <Chip
        label="All"
        active={selected === null}
        onPress={() => onSelect(null)}
      />
      {categories.map((category) => (
        <Chip
          key={category}
          label={category}
          active={selected === category}
          onPress={() => onSelect(category)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
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
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  rowAlign: {
    alignItems: "flex-start",
  },
  chip: {
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
  },
  chipLabelActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
});
