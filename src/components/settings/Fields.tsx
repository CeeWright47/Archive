import { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type TextStyle,
    type ViewStyle,
} from "react-native";

import { theme } from "@/theme/tokens";

interface NumericFieldProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  /** Trailing unit label, e.g. "lb" or "in". */
  unit?: string;
  placeholder?: string;
  maxLength?: number;
  integer?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Keeps a local string while typing and only reports a parsed number on blur,
// so partial input like "5." never round-trips through the store.
export function NumericField({
  value,
  onCommit,
  unit,
  placeholder,
  maxLength,
  integer = false,
  style,
}: NumericFieldProps) {
  const [text, setText] = useState(value === null ? "" : String(value));

  useEffect(() => {
    setText(value === null ? "" : String(value));
  }, [value]);

  function handleBlur() {
    const trimmed = text.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = integer ? parseInt(trimmed, 10) : parseFloat(trimmed);
    if (Number.isNaN(parsed)) {
      setText(value === null ? "" : String(value));
      return;
    }
    onCommit(parsed);
  }

  return (
    <View style={[styles.wrapper, style]}>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        inputMode={integer ? "numeric" : "decimal"}
        maxLength={maxLength}
        selectionColor={theme.colors.accent}
        style={styles.input}
      />
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

interface MultilineFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function MultilineField({
  value,
  onChangeText,
  onBlur,
  placeholder,
}: MultilineFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      multiline
      textAlignVertical="top"
      autoCapitalize="sentences"
      selectionColor={theme.colors.accent}
      style={[styles.wrapper, styles.input, styles.multiline]}
    />
  );
}

interface TextFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
  returnKeyType?: TextInputProps["returnKeyType"];
  editable?: boolean;
  style?: StyleProp<TextStyle>;
}

export function TextField({ style, ...props }: TextFieldProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.colors.textMuted}
      selectionColor={theme.colors.accent}
      style={[
        styles.wrapper,
        styles.input,
        props.editable === false && styles.readOnly,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    textAlign: "left",
  },
  multiline: {
    // Explicit width so the web textarea has a definite size on first paint
    // instead of waiting for flex layout to resolve, which otherwise briefly
    // renders unwrapped text right after a step transition.
    width: "100%",
    minHeight: 180,
    paddingVertical: theme.spacing.sm,
  },
  unit: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.xs,
  },
  readOnly: {
    color: theme.colors.textMuted,
  },
});
