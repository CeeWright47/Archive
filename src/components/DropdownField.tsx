import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme/tokens";

interface DropdownFieldProps {
  value: string | null;
  options: readonly string[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Shown as the picker sheet's heading. */
  title: string;
  /** Adds a "Not set" row above the options that clears the value. */
  clearable?: boolean;
}

// Compact, single-line "picker" field: a pressable row showing the current
// value, opening a sheet of options on tap instead of wrapping chips — used
// wherever a field's value must come from a fixed vocabulary.
export function DropdownField({
  value,
  options,
  onChange,
  placeholder = "Select…",
  title,
  clearable = false,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  // A legacy/free-text value that predates the fixed vocabulary stays visible
  // and selectable at the top of the list instead of silently disappearing.
  const listOptions =
    value && !options.includes(value) ? [value, ...options] : options;

  function select(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <Text
          style={[styles.value, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={theme.colors.textMuted}
        />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + theme.spacing.md },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={listOptions}
            keyExtractor={(item) => item}
            style={styles.list}
            ListHeaderComponent={
              clearable ? (
                <Option
                  label="Not set"
                  muted
                  active={!value}
                  onPress={() => select(null)}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <Option
                label={item}
                active={item === value}
                onPress={() => select(item)}
              />
            )}
          />
        </View>
      </Modal>
    </>
  );
}

function Option({
  label,
  active,
  muted,
  onPress,
}: {
  label: string;
  active: boolean;
  muted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.option}
    >
      <Text
        style={[
          styles.optionLabel,
          muted && styles.optionLabelMuted,
          active && styles.optionLabelActive,
        ]}
      >
        {label}
      </Text>
      {active && (
        <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.background,
  },
  value: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  placeholder: {
    color: theme.colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: theme.colors.backgroundElevated,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: theme.spacing.xl,
    height: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: theme.tracking.caption,
    marginBottom: theme.spacing.xs,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  optionLabel: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  optionLabelMuted: {
    color: theme.colors.textMuted,
  },
  optionLabelActive: {
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
  },
});
