import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { ChipGroup } from "@/components/settings";
import type { PieceFit } from "@/storage/fitVocabulary";
import { theme } from "@/theme/tokens";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortSheetProps<T extends string> {
  visible: boolean;
  options: readonly SortOption<T>[];
  value: T;
  onSelect: (sort: T) => void;
  /** Wardrobe only: fit values relevant to the active category; empty or omitted hides the filter. */
  fitOptions?: readonly PieceFit[];
  fitValue?: PieceFit | null;
  onFitChange?: (fit: PieceFit | null) => void;
  onClose: () => void;
}

export function SortSheet<T extends string>({
  visible,
  options,
  value,
  onSelect,
  fitOptions = [],
  fitValue = null,
  onFitChange,
  onClose,
}: SortSheetProps<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>Sort by</Text>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {option.label}
              </Text>
              {active && (
                <Ionicons
                  name="checkmark"
                  size={theme.spacing.md + 2}
                  color={theme.colors.accent}
                />
              )}
            </Pressable>
          );
        })}

        {fitOptions.length > 0 && onFitChange && (
          <>
            <Text style={[styles.title, styles.filterTitle]}>
              Filter by fit
            </Text>
            <ChipGroup
              mode="single"
              options={fitOptions}
              value={fitValue}
              onChange={onFitChange}
            />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  title: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
  },
  filterTitle: {
    marginTop: theme.spacing.md,
  },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  labelActive: {
    color: theme.colors.accent,
  },
});
