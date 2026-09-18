import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme/tokens";
import { ErrorText } from "./Text";

export interface ProfileSaveAction {
  save: () => void | Promise<void>;
  dirty: boolean;
  saving: boolean;
}

export function ProfilePage({
  loading,
  error,
  children,
  saveAction,
}: {
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  saveAction?: ProfileSaveAction;
}) {
  const insets = useSafeAreaInsets();
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          saveAction && { paddingBottom: 80 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {saveAction ? <ProfileSaveDock action={saveAction} /> : null}
    </View>
  );
}

export function ProfileSaveDock({ action }: { action: ProfileSaveAction }) {
  const insets = useSafeAreaInsets();
  const handleSave = () => {
    Keyboard.dismiss();
    void action.save();
  };
  return (
    <View
      style={[
        styles.saveDock,
        { paddingBottom: insets.bottom + theme.spacing.xs },
      ]}
    >
      <PrimaryButton
        label={action.saving ? "Saving..." : "Save"}
        onPress={handleSave}
        disabled={!action.dirty || action.saving}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
    alignItems: "stretch",
  },
  center: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: theme.colors.background,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
  },
  primaryLabel: {
    color: theme.colors.background,
    fontSize: theme.typography.headline.fontSize,
    fontWeight: theme.typography.headline.fontWeight,
  },
  disabled: { opacity: 0.45 },
  saveDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
});
