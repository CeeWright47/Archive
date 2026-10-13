import { Ionicons } from "@expo/vector-icons";
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

import { ai } from "@/ai";
import { BottomDock } from "@/components/BottomDock";
import { PageTitle } from "@/components/PageTitle";
import {
    settings,
    type ClosetGapItem,
    type ClosetGaps,
} from "@/storage/settings";
import { theme } from "@/theme/tokens";

export default function InsightsScreen() {
  const [dockHeight, setDockHeight] = useState(0);
  const [closetGaps, setClosetGaps] = useState<ClosetGaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);

  async function load() {
    try {
      setError(null);
      const profileSettings = await settings.getProfileSettings();
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

  const acquiredCount =
    closetGaps?.items.filter((item) => item.owned).length ?? 0;
  const gapItems = closetGaps?.items ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: dockHeight }]}
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
          Gaps we noticed in your closet, worth filling.
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gaps in the archive</Text>
          <Text style={styles.sectionCount}>
            {acquiredCount}/{gapItems.length} acquired
          </Text>
        </View>

        {closetGaps && closetGaps.verdict.length > 0 && (
          <Text style={styles.verdict}>{closetGaps.verdict}</Text>
        )}

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

      <BottomDock
        icon="refresh-outline"
        label="Re-run analysis"
        accessibilityLabel="Re-run analysis"
        onPress={handleRerunAnalysis}
        loading={rerunning}
        onHeightChange={setDockHeight}
      />
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
});
