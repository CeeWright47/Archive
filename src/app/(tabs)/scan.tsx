import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme/tokens";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setScanning(true);
    try {
      Alert.alert(
        "Coming soon",
        "Scanning an item isn’t wired up yet — this needs an AI provider to be configured.",
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Cop or skip?</Text>
        <Text style={styles.subtitle}>
          See something in a store or online? Snap it and get a verdict against
          your actual closet.
        </Text>
      </View>

      <View
        style={[styles.dock, { marginBottom: insets.bottom + theme.spacing.xs }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan an item"
          disabled={scanning}
          onPress={handleScan}
          style={styles.scanButton}
        >
          {scanning ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Ionicons
              name="camera-outline"
              size={theme.spacing.lg}
              color={theme.colors.background}
            />
          )}
          <Text style={styles.scanLabel}>Scan an item</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  heading: {
    fontSize: theme.typography.title1.fontSize,
    lineHeight: theme.typography.title1.lineHeight,
    fontWeight: theme.typography.title1.fontWeight,
    color: theme.colors.text,
    fontFamily: theme.fonts.serif,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  dock: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 0,
    backgroundColor: theme.colors.background,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  scanLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
});
