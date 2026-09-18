import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ai } from "@/ai";
import { PageTitle } from "@/components/PageTitle";
import {
    settings,
    type ClosetGapItem,
    type ClosetGaps,
} from "@/storage/settings";
import {
    imageUriForWant,
    wants as wantsStore,
    type Want,
} from "@/storage/wants";
import { theme } from "@/theme/tokens";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [allWants, setAllWants] = useState<Want[]>([]);
  const [closetGaps, setClosetGaps] = useState<ClosetGaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);

  async function load() {
    try {
      setError(null);
      const [storedWants, profileSettings] = await Promise.all([
        wantsStore.list(),
        settings.getProfileSettings(),
      ]);
      setAllWants(storedWants);
      setClosetGaps(profileSettings.closetGaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t load insights.");
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
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

  async function handleToggleGapItem(index: number, owned: boolean) {
    if (!closetGaps) return;
    const previous = closetGaps;
    const nextItems = closetGaps.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, owned } : item,
    );
    setClosetGaps({ ...closetGaps, items: nextItems });
    try {
      const updated = await settings.setClosetGapOwned(index, owned);
      setClosetGaps(updated);
    } catch (err) {
      setClosetGaps(previous);
      Alert.alert(
        "Couldn’t update item",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  async function handleRerunAnalysis() {
    setRerunning(true);
    try {
      const result = await ai.analyzeWardrobeGaps();
      setClosetGaps({
        verdict: result.verdict,
        items: result.items,
        stopBuying: result.stop_buying,
      });
    } catch (error) {
      Alert.alert(
        "Analysis failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRerunning(false);
    }
  }

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
        <Text style={styles.emptyBody}>{error}</Text>
      </View>
    );
  }

  const boughtCount = allWants.filter((want) => want.owned).length;
  const acquiredCount =
    closetGaps?.items.filter((item) => item.owned).length ?? 0;
  const gapItems = closetGaps?.items ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        <PageTitle>What’s missing</PageTitle>
        <Text style={styles.subtitle}>
          Items spotted while you were out and gaps we noticed in your closet.
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spotted in the wild</Text>
          <Text style={styles.sectionCount}>
            {boughtCount}/{allWants.length} bought
          </Text>
        </View>

        {allWants.length === 0 ? (
          <Text style={styles.emptyBody}>Nothing spotted yet.</Text>
        ) : (
          <View style={styles.list}>
            {allWants.map((want) => (
              <WantCard
                key={want.id}
                want={want}
                onToggleOwned={() => handleToggleOwned(want)}
                onDismiss={() => handleDismissWant(want.id)}
              />
            ))}
          </View>
        )}

        {closetGaps && closetGaps.verdict.length > 0 && (
          <Text style={styles.verdict}>{closetGaps.verdict}</Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gaps in the archive</Text>
          <Text style={styles.sectionCount}>
            {acquiredCount}/{gapItems.length} acquired
          </Text>
        </View>

        {gapItems.length === 0 ? (
          <Text style={styles.emptyBody}>No closet gaps identified yet.</Text>
        ) : (
          <View style={styles.list}>
            {gapItems.map((item, index) => (
              <GapRow
                key={`${item.item}-${index}`}
                item={item}
                onToggle={() => handleToggleGapItem(index, !item.owned)}
              />
            ))}
          </View>
        )}

        {closetGaps && closetGaps.stopBuying.length > 0 && (
          <Text style={styles.stopBuying}>{closetGaps.stopBuying}</Text>
        )}
      </ScrollView>

      <View
        style={[
          styles.dock,
          { marginBottom: insets.bottom + theme.spacing.xs },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Re-run analysis"
          disabled={rerunning}
          onPress={handleRerunAnalysis}
          style={styles.rerunButton}
        >
          {rerunning ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={theme.spacing.lg}
              color={theme.colors.background}
            />
          )}
          <Text style={styles.rerunLabel}>Re-run analysis</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WantCard({
  want,
  onToggleOwned,
  onDismiss,
}: {
  want: Want;
  onToggleOwned: () => void;
  onDismiss: () => void;
}) {
  const uri = imageUriForWant(want);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${want.item}`}
        onPress={onDismiss}
        style={styles.cardDismiss}
      >
        <Ionicons name="close" size={16} color={theme.colors.textMuted} />
      </Pressable>
      <View style={styles.imageWrapper}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName} numberOfLines={2}>
            {want.item}
          </Text>
          <Text style={styles.score}>{want.score}/10</Text>
        </View>
        {want.reason.length > 0 && (
          <Text style={styles.reason} numberOfLines={4}>
            {want.reason}
          </Text>
        )}
        <View style={styles.cardFooter}>
          {want.price.length > 0 && (
            <Text style={styles.price}>{want.price}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              want.owned ? "Mark as not bought" : "Mark as bought"
            }
            onPress={onToggleOwned}
            style={[styles.ownedButton, want.owned && styles.ownedButtonActive]}
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
              style={[styles.ownedLabel, want.owned && styles.ownedLabelActive]}
            >
              {want.owned ? "Bought" : "Mark bought"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function GapRow({
  item,
  onToggle,
}: {
  item: ClosetGapItem;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.owned }}
      onPress={onToggle}
      style={styles.gapRow}
    >
      <Ionicons
        name={item.owned ? "checkbox" : "square-outline"}
        size={theme.spacing.lg}
        color={item.owned ? theme.colors.accent : theme.colors.textMuted}
      />
      <View style={styles.gapBody}>
        <Text style={[styles.gapItem, item.owned && styles.gapItemDone]}>
          {item.item}
        </Text>
        {item.why.length > 0 && (
          <Text style={styles.gapWhy} numberOfLines={2}>
            {item.why}
          </Text>
        )}
      </View>
      {item.price.length > 0 && (
        <Text style={styles.gapPrice}>{item.price}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
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
  verdict: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  stopBuying: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  list: {
    gap: theme.spacing.sm,
  },
  card: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  cardDismiss: {
    position: "absolute",
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    padding: theme.spacing.xxs,
    zIndex: 1,
  },
  imageWrapper: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  image: {
    width: 88,
    height: 88,
  },
  imageFallback: {
    backgroundColor: theme.colors.background,
  },
  cardBody: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.lg,
  },
  itemName: {
    flex: 1,
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
  score: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
  },
  reason: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.xxs,
  },
  price: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.text,
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
  gapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  gapBody: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  gapItem: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  gapItemDone: {
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
  },
  gapWhy: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
  gapPrice: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.text,
  },
  dock: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 0,
    backgroundColor: theme.colors.background,
  },
  rerunButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  rerunLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
});
