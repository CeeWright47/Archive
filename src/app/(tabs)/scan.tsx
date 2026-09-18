import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ai, type ScanResult } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { PageTitle } from "@/components/PageTitle";
import { pickImage } from "@/media/pickImage";
import { wants, type Want } from "@/storage/wants";
import { theme } from "@/theme/tokens";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    try {
      const picked = await pickImage.fromLibrary();
      if (!picked) return;
      setImageUri(picked.uri);
      const image = await prepareAiImage(picked.uri);
      const next = await ai.scanItem(image);
      setResult(next);
      if (next.verdict === "cop") {
        const want: Want = {
          id: `want_${Date.now().toString(36)}`,
          item: next.item || "Scanned item",
          reason: next.take,
          price: next.price ?? "",
          score: next.score,
          owned: false,
          added: Date.now(),
        };
        await wants.add(want, image);
      }
    } catch (error) {
      Alert.alert(
        "Scan failed",
        error instanceof Error ? error.message : "Try another angle.",
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PageTitle>Cop or skip?</PageTitle>
        <Text style={styles.subtitle}>
          See something in a store or online? Snap it and get a verdict against
          your actual closet.
        </Text>
      </View>
      <View style={styles.content}>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            contentFit="cover"
          />
        )}
        {result && (
          <View style={styles.result}>
            <Text style={styles.verdict}>{result.verdict}</Text>
            <Text style={styles.score}>{result.score}/10 closet fit</Text>
            <Text style={styles.item}>{result.item}</Text>
            <Text style={styles.take}>{result.take}</Text>
            {result.price && <Text style={styles.price}>{result.price}</Text>}
          </View>
        )}
      </View>

      <View
        style={[
          styles.dock,
          { marginBottom: insets.bottom + theme.spacing.xs },
        ]}
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
  header: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.none,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  preview: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 4 / 3,
    borderRadius: theme.radii.md,
  },
  result: {
    width: "100%",
    maxWidth: 360,
    gap: theme.spacing.xxs,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
  },
  verdict: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title1.fontSize,
    color: theme.colors.accent,
    textTransform: "capitalize",
  },
  score: { color: theme.colors.textMuted },
  item: {
    color: theme.colors.text,
    fontSize: theme.typography.headline.fontSize,
  },
  take: {
    color: theme.colors.textMuted,
    lineHeight: theme.typography.body.lineHeight,
  },
  price: { color: theme.colors.text },
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
