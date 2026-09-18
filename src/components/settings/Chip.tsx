import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

export type ChipVariant = "outlined" | "filled" | "avoid";

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function Chip({
  label,
  variant = "outlined",
  onPress,
  onLongPress,
}: ChipProps) {
  const filled = variant === "filled";
  const avoid = variant === "avoid";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: filled }}
      accessibilityLabel={avoid ? `${label}, avoided` : label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.chip,
        filled && styles.chipFilled,
        avoid && styles.chipAvoid,
      ]}
    >
      {avoid && <Text style={styles.avoidMark}>✕</Text>}
      <Text
        style={[
          styles.label,
          filled && styles.labelFilled,
          avoid && styles.labelAvoid,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SingleProps<T extends string> = {
  mode: "single";
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowDeselect?: boolean;
};

type MultiProps<T extends string> = {
  mode: "multi";
  options: readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
};

export type TriState = "neutral" | "worn" | "avoid";

type TristateProps<T extends string> = {
  mode: "tristate";
  options: readonly T[];
  value: Record<string, TriState>;
  onChange: (option: T, next: TriState) => void;
  onLongPress?: (option: T) => void;
};

export type ChipGroupProps<T extends string> =
  | SingleProps<T>
  | MultiProps<T>
  | TristateProps<T>;

const NEXT_TRISTATE: Record<TriState, TriState> = {
  neutral: "worn",
  worn: "avoid",
  avoid: "neutral",
};

const TRISTATE_VARIANT: Record<TriState, ChipVariant> = {
  neutral: "outlined",
  worn: "filled",
  avoid: "avoid",
};

export function ChipGroup<T extends string>(props: ChipGroupProps<T>) {
  return (
    <View style={styles.group}>
      {props.options.map((option) => {
        if (props.mode === "single") {
          const selected = props.value === option;
          return (
            <Chip
              key={option}
              label={option}
              variant={selected ? "filled" : "outlined"}
              onPress={() =>
                props.onChange(
                  selected && props.allowDeselect !== false ? null : option,
                )
              }
            />
          );
        }
        if (props.mode === "multi") {
          const selected = props.value.includes(option);
          return (
            <Chip
              key={option}
              label={option}
              variant={selected ? "filled" : "outlined"}
              onPress={() =>
                props.onChange(
                  selected
                    ? props.value.filter((v) => v !== option)
                    : [...props.value, option],
                )
              }
            />
          );
        }
        const state = props.value[option] ?? "neutral";
        return (
          <Chip
            key={option}
            label={option}
            variant={TRISTATE_VARIANT[state]}
            onPress={() => props.onChange(option, NEXT_TRISTATE[state])}
            onLongPress={
              props.onLongPress ? () => props.onLongPress?.(option) : undefined
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    alignItems: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
    minHeight: 36,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
  },
  chipFilled: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipAvoid: {
    borderColor: theme.colors.textMuted,
  },
  label: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  labelFilled: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
  labelAvoid: {
    color: theme.colors.text,
  },
  avoidMark: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.text,
  },
});
