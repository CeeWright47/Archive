import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { theme } from "@/theme/tokens";

// Nested stacks (profile, outfits) are only ever entered via push from a tab,
// so their first screen still needs a back chevron even though React
// Navigation's default header hides it there (canGoBack() is scoped to the
// local stack, not the root one this screen was pushed from).
export function BackButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={theme.spacing.sm}
      onPress={() => router.back()}
      style={styles.button}
    >
      <Ionicons name="chevron-back" size={theme.spacing.lg} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -theme.spacing.xs,
  },
});
