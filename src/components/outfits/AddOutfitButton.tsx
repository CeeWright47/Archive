import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme/tokens";

interface AddOutfitButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export function AddOutfitButton({ onPress, loading }: AddOutfitButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.dock, { marginBottom: insets.bottom + theme.spacing.xs }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log an outfit"
        disabled={loading}
        onPress={onPress}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Ionicons
            name="camera-outline"
            size={theme.spacing.lg}
            color={theme.colors.background}
          />
        )}
        <Text style={styles.label}>Log an outfit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.none,
    backgroundColor: theme.colors.background,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  label: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
});
