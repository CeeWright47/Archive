import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme/tokens";

interface BottomSheetProps {
  visible?: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Shared shell for every bottom sheet in the app: capped at ~85% of the
// screen height so a visible strip of the page stays tappable above it,
// dismissible by tapping the dimmed backdrop or the top-right × button.
export function BottomSheet({
  visible = true,
  onClose,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={styles.backdrop}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        <View style={styles.handle} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={styles.close}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </Pressable>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: theme.colors.backgroundElevated,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingTop: theme.spacing.xs,
  },
  handle: {
    alignSelf: "center",
    width: theme.spacing.xl,
    height: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  close: {
    position: "absolute",
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
