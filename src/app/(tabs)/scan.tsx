import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
} from "react-native-reanimated";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { ai, type ScanResult } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { BottomDock } from "@/components/BottomDock";
import { PageTitle } from "@/components/PageTitle";
import { PhotoSourceSheet } from "@/components/PhotoSourceSheet";
import { pickImage } from "@/media/pickImage";
import {
    imageUriForWant,
    wants as wantsStore,
    type Want,
} from "@/storage/wants";
import { theme } from "@/theme/tokens";

export default function ScanScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const [choosingSource, setChoosingSource] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [allWants, setAllWants] = useState<Want[]>([]);
  const [loadingWants, setLoadingWants] = useState(true);
  // Accordion: at most one spotted item is open at a time.
  const [expandedWantId, setExpandedWantId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadWants() {
    try {
      setAllWants(await wantsStore.list());
    } catch {
      // Keep showing whatever was already loaded.
    }
  }

  useEffect(() => {
    loadWants().finally(() => setLoadingWants(false));
  }, []);

  // Re-tapping the Scan tab while already on it clears the last scan result
  // and scrolls back to the top.
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as never, () => {
      if (!navigation.isFocused()) return;
      setResult(null);
      setImageUri(null);
      setExpandedWantId(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadWants();
    setRefreshing(false);
  }

  async function handleToggleOwned(want: Want) {
    const nextOwned = !want.owned;
    setAllWants((current) =>
      current.map((w) => (w.id === want.id ? { ...w, owned: nextOwned } : w)),
    );
    try {
      await wantsStore.setOwned(want.id, nextOwned);
    } catch {
      setAllWants((current) =>
        current.map((w) =>
          w.id === want.id ? { ...w, owned: want.owned } : w,
        ),
      );
    }
  }

  async function handleDismissWant(id: string) {
    const previous = allWants;
    setAllWants((current) => current.filter((w) => w.id !== id));
    try {
      await wantsStore.remove(id);
    } catch (err) {
      setAllWants(previous);
      Alert.alert(
        "Couldn’t remove item",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

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
        await wantsStore.add(want, image);
        setAllWants((current) => [want, ...current]);
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

  const boughtCount = allWants.filter((want) => want.owned).length;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: dockHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        <PageTitle>Cop or skip?</PageTitle>
        <Text style={styles.subtitle}>
          See something in a store or online? Snap it and get a verdict
          against your actual closet.
        </Text>

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
            <Text style={styles.resultScore}>{result.score}/10 closet fit</Text>
            <Text style={styles.item}>{result.item}</Text>
            <Text style={styles.take}>{result.take}</Text>
            {result.price && <Text style={styles.price}>{result.price}</Text>}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spotted in the wild</Text>
          <Text style={styles.sectionCount}>
            {boughtCount}/{allWants.length} bought
          </Text>
        </View>

        {loadingWants ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : allWants.length === 0 ? (
          <Text style={styles.emptyBody}>Nothing spotted yet.</Text>
        ) : (
          <View style={styles.list}>
            {allWants.map((want) => (
              <WantCard
                key={want.id}
                want={want}
                expanded={expandedWantId === want.id}
                onToggleExpanded={() =>
                  setExpandedWantId((current) =>
                    current === want.id ? null : want.id,
                  )
                }
                onToggleOwned={() => handleToggleOwned(want)}
                onDismiss={() => handleDismissWant(want.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

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

function WantCard({
  want,
  expanded,
  onToggleExpanded,
  onToggleOwned,
  onDismiss,
}: {
  want: Want;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleOwned: () => void;
  onDismiss: () => void;
}) {
  const uri = imageUriForWant(want);
  return (
    <Animated.View layout={LinearTransition.duration(180)} style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${want.item}, ${want.score} out of 10 closet fit${want.owned ? ", bought" : ""}`}
        accessibilityHint={expanded ? "Hides details" : "Shows details"}
        onPress={onToggleExpanded}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
      >
        <View style={styles.imageWrapper}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imageFallback]} />
          )}
        </View>
        <View style={styles.cardTitle}>
          <Text style={styles.itemName} numberOfLines={2}>
            {want.item}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardScore}>{want.score}/10</Text>
            {want.owned ? <Text style={styles.boughtTag}>BOUGHT</Text> : null}
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={theme.spacing.md + 2}
          color={theme.colors.textMuted}
        />
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.cardBody}
        >
          {want.reason.length > 0 && (
            <Text style={styles.reason}>{want.reason}</Text>
          )}
          <View style={styles.cardFooter}>
            {want.price.length > 0 ? (
              <Text style={styles.price}>{want.price}</Text>
            ) : (
              <View />
            )}
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${want.item}`}
                onPress={onDismiss}
                hitSlop={theme.spacing.xs}
                style={styles.removeButton}
              >
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  want.owned ? "Mark as not bought" : "Mark as bought"
                }
                onPress={onToggleOwned}
                style={[
                  styles.ownedButton,
                  want.owned && styles.ownedButtonActive,
                ]}
              >
                <Ionicons
                  name={
                    want.owned ? "checkmark-circle" : "checkmark-circle-outline"
                  }
                  size={16}
                  color={
                    want.owned ? theme.colors.background : theme.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.ownedLabel,
                    want.owned && styles.ownedLabelActive,
                  ]}
                >
                  {want.owned ? "Bought" : "Mark bought"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radii.md,
  },
  result: {
    width: "100%",
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
  resultScore: { color: theme.colors.textMuted },
  item: {
    color: theme.colors.text,
    fontSize: theme.typography.headline.fontSize,
  },
  take: {
    color: theme.colors.textMuted,
    lineHeight: theme.typography.body.lineHeight,
  },
  price: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
  },
  emptyBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  list: {
    gap: theme.spacing.sm,
  },
  card: {
    overflow: "hidden",
    padding: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  imageWrapper: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  image: {
    width: 56,
    height: 56,
  },
  imageFallback: {
    backgroundColor: theme.colors.background,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  cardTitle: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  boughtTag: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.textMuted,
  },
  cardBody: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  removeButton: {
    paddingVertical: theme.spacing.xxs,
  },
  removeLabel: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.danger,
  },
  itemName: {
    flex: 1,
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
  cardScore: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
  },
  reason: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.xxs,
  },
  ownedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  ownedButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  ownedLabel: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.colors.textMuted,
  },
  ownedLabelActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
});
