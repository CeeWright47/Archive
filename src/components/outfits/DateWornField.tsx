import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
    formatDate,
    parseDateString,
    toDateString,
    todayString,
} from "@/storage/dates";
import { theme } from "@/theme/tokens";

interface DateWornFieldProps {
  /** "YYYY-MM-DD", or "" when unset. */
  value: string;
  onChange: (value: string) => void;
}

function yesterdayString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toDateString(date);
}

/**
 * Today / Yesterday shortcuts above a row showing the formatted date. Tapping
 * the row opens the native picker (inline calendar on iOS, dialog on
 * Android), capped at today.
 */
export function DateWornField({ value, onChange }: DateWornFieldProps) {
  const [open, setOpen] = useState(false);
  const today = todayString();
  const yesterday = yesterdayString();
  const selected = parseDateString(value) ?? new Date();

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {[
          { label: "Today", date: today },
          { label: "Yesterday", date: yesterday },
        ].map(({ label, date }) => {
          const active = value === date;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onChange(date);
                setOpen(false);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Date worn, ${value ? formatDate(value) : "not set"}`}
        accessibilityHint="Opens a calendar"
        onPress={() => setOpen((current) => !current)}
        style={styles.row}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDate(value) : "Choose a date"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "calendar-outline"}
          size={theme.spacing.md + 2}
          color={theme.colors.textMuted}
        />
      </Pressable>

      {open ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          maximumDate={new Date()}
          themeVariant="dark"
          accentColor={theme.colors.accent}
          onChange={(event, date) => {
            // Android's dialog closes itself; iOS stays open until the row
            // is tapped again or a day is picked.
            setOpen(false);
            if (event.type === "set" && date) onChange(toDateString(date));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  chips: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs + 2,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.text,
  },
  chipTextActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  value: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  placeholder: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
});
