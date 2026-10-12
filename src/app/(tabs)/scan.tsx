import { Image } from "expo-image";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ai, type ScanResult } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { BottomDock } from "@/components/BottomDock";
import { PageTitle } from "@/components/PageTitle";
import { PhotoSourceSheet } from "@/components/PhotoSourceSheet";
import { pickImage } from "@/media/pickImage";
import { wants, type Want } from "@/storage/wants";
import { theme } from "@/theme/tokens";

export default function ScanScreen() {
  const [dockHeight, setDockHeight] = useState(0);
  const [choosingSource, setChoosingSource] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  async function handlePickSource(source: "camera" | "library") {
    setChoosingSource(false);
    setScanning(true);
    try {
      const picked =
        source === "camera"
          ? await pickImage.fromCamera()
          : await pickImage.fromLibrary();
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
      <View style={[styles.content, { paddingBottom: dockHeight }]}>
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

      <BottomDock
        icon="camera-outline"
        label="Scan an item"
        accessibilityLabel="Scan an item"
        onPress={() => setChoosingSource(true)}
        loading={scanning}
        onHeightChange={setDockHeight}
      />

      <PhotoSourceSheet
        visible={choosingSource}
        title="Scan an item"
        onClose={() => setChoosingSource(false)}
        onPickCamera={() => handlePickSource("camera")}
        onPickLibrary={() => handlePickSource("library")}
      />
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
});
