import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
} from "react-native";

import { theme } from "@/theme/tokens";

interface BottomDockProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  loading?: boolean;
  onHeightChange?: (height: number) => void;
}

// Docked flush above the tab bar. The Tabs screen area already stops at the
// tab bar's top edge (tabBarStyle isn't absolutely positioned), so bottom: 0
// here lands exactly there — no extra tab-bar-height or safe-area offset
// needed on top of that.
export function BottomDock({
  icon,
  label,
  accessibilityLabel,
  onPress,
  loading,
  onHeightChange,
}: BottomDockProps) {
  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(Math.ceil(event.nativeEvent.layout.height));
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={loading}
        onPress={onPress}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Ionicons
            name={icon}
            size={theme.spacing.lg}
            color={theme.colors.background}
          />
        )}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
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
