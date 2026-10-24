import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

import { USERNAME_PATTERN, profileStore } from "@/storage/profile";
import { theme } from "@/theme/tokens";

type Status = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

interface UsernameFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Fires whenever the field's submittable state changes: true when
   *  empty (username is optional) or confirmed available. */
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
}

const CHECK_DEBOUNCE_MS = 450;

function invalidReason(value: string): string | null {
  if (value.length < 3) return "At least 3 characters.";
  if (value.length > 20) return "20 characters max.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Lowercase letters, numbers, underscores — start with a letter.";
  }
  return null;
}

// Sanitizes keystrokes toward the allowed character set rather than
// rejecting them outright: lowercases and drops anything that isn't a
// letter, digit, or underscore, so pasting "John.Doe!" still lands
// something useful ("johndoe") instead of silently doing nothing.
function sanitize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function UsernameField({
  value,
  onChangeText,
  onValidityChange,
  placeholder = "yourname",
}: UsernameFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const checkRef = useRef(0);

  useEffect(() => {
    onValidityChange?.(value === "" || status === "available");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, status]);

  useEffect(() => {
    if (value === "") {
      setStatus("idle");
      return;
    }
    const reason = invalidReason(value);
    if (reason) {
      setStatus("invalid");
      return;
    }
    // The RPC excludes the signed-in user's own row server-side, so this
    // correctly resolves "available" for a value that's already theirs —
    // including one they just saved, with no client-side staleness risk.
    setStatus("checking");
    const requestId = ++checkRef.current;
    const timer = setTimeout(async () => {
      try {
        const available = await profileStore.checkUsernameAvailable(value);
        if (checkRef.current !== requestId) return;
        setStatus(available ? "available" : "taken");
      } catch {
        if (checkRef.current !== requestId) return;
        setStatus("error");
      }
    }, CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.field}>
        <Text style={styles.at}>@</Text>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(sanitize(text))}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          selectionColor={theme.colors.accent}
          style={styles.input}
        />
        {status === "checking" ? (
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
        ) : null}
      </View>
      <StatusLine status={status} />
    </View>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status === "idle" || status === "checking") return null;
  const text =
    status === "available"
      ? "Available"
      : status === "taken"
        ? "Already taken"
        : status === "error"
          ? "Couldn’t check availability — try again."
          : null;
  if (!text) return null;
  return (
    <Text
      style={[
        styles.status,
        status === "available" ? styles.statusGood : styles.statusBad,
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.xxs },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
  },
  at: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.xxs,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  status: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    paddingHorizontal: theme.spacing.xxs,
  },
  statusGood: { color: theme.colors.accent },
  statusBad: { color: theme.colors.danger },
});
