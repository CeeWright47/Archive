import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { theme } from "@/theme/tokens";

interface PhotoSourceSheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onPickCamera: () => void;
  onPickLibrary: () => void;
}

// Shared "where's the photo coming from" picker — triggers the native
// camera/photo-library permission prompts via pickImage.fromCamera /
// pickImage.fromLibrary at the call site.
export function PhotoSourceSheet({
  visible,
  title = "Add a photo",
  onClose,
  onPickCamera,
  onPickLibrary,
}: PhotoSourceSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.body}>Choose where to get your photo.</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={onPickCamera}
        >
          <Text style={styles.primaryLabel}>Take photo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.secondaryButton}
          onPress={onPickLibrary}
        >
          <Text style={styles.secondaryLabel}>Photo library</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  heading: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  primaryLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  secondaryLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
});
