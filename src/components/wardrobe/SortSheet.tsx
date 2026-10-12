import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { ChipGroup } from "@/components/settings";
import type { PieceFit } from "@/storage/fitVocabulary";
import {
    SORT_OPTIONS,
    WORN_SORTS,
    type WardrobeSort,
} from "@/storage/wardrobeSort";
import { theme } from "@/theme/tokens";

interface SortSheetProps {
  visible: boolean;
  value: WardrobeSort;
  showWornOptions: boolean;
  onSelect: (sort: WardrobeSort) => void;
  /** Fit values relevant to the active category; empty hides the filter. */
  fitOptions: readonly PieceFit[];
  fitValue: PieceFit | null;
  onFitChange: (fit: PieceFit | null) => void;
  onClose: () => void;
}

export function SortSheet({
  visible,
  value,
  showWornOptions,
  onSelect,
  fitOptions,
  fitValue,
  onFitChange,
  onClose,
}: SortSheetProps) {
  const options = SORT_OPTIONS.filter(
    (option) => showWornOptions || !WORN_SORTS.includes(option.value),
  );

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

        {fitOptions.length > 0 && (
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
