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
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fits, type Fit } from "@/storage/fits";
import { imageUriFor, pieces, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

export default function OutfitsScreen() {
  const insets = useSafeAreaInsets();
  const [occasion, setOccasion] = useState("");
  const [allFits, setAllFits] = useState<Fit[]>([]);
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      setError(null);
      const [storedFits, storedPieces] = await Promise.all([
        fits.list(),
        pieces.list(),
      ]);
      setAllFits(storedFits);
      setAllPieces(storedPieces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t load fits.");
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

  async function handleDeleteFit(id: string) {
    const previous = allFits;
    setAllFits((current) => current.filter((fit) => fit.id !== id));
    try {
      await fits.remove(id);
    } catch (err) {
      setAllFits(previous);
      Alert.alert(
        "Couldn’t delete fit",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  async function handleGenerateFit() {
    setGenerating(true);
    try {
      Alert.alert(
        "Coming soon",
        "AI fit generation isn’t wired up yet — this needs an AI provider to be configured.",
      );
    } finally {
      setGenerating(false);
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
      >
        <Text style={styles.heading}>Build a fit</Text>
        <TextInput
          style={styles.occasionInput}
          value={occasion}
          onChangeText={setOccasion}
          placeholder="What’s the occasion?"
          placeholderTextColor={theme.colors.textMuted}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lookbook</Text>
          <Text style={styles.sectionSubtitle}>
            {allFits.length} fit{allFits.length === 1 ? "" : "s"} on file. Tap a
            piece row to see what’s in it.
          </Text>
        </View>

        {allFits.length === 0 ? (
          <Text style={styles.emptyBody}>No saved fits yet.</Text>
        ) : (
          <View style={styles.fitList}>
            {allFits.map((fit) => (
              <FitCard
                key={fit.id}
                fit={fit}
                pieces={allPieces}
                onDelete={() => handleDeleteFit(fit.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={[styles.dock, { marginBottom: insets.bottom + theme.spacing.xs }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate fit"
          disabled={generating}
          onPress={handleGenerateFit}
          style={styles.generateButton}
        >
          {generating ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Ionicons
              name="sparkles-outline"
              size={theme.spacing.lg}
              color={theme.colors.background}
            />
          )}
          <Text style={styles.generateLabel}>Generate fit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FitCard({
  fit,
  pieces: allPieces,
  onDelete,
}: {
  fit: Fit;
  pieces: Piece[];
  onDelete: () => void;
}) {
  const linkedPieces = fit.pieceIds
    .map((id) => allPieces.find((piece) => piece.id === id))
    .filter((piece): piece is Piece => piece != null);

  return (
    <View style={styles.fitCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${fit.title || "fit"}`}
        onPress={onDelete}
        style={styles.fitDelete}
      >
        <Ionicons name="close" size={16} color={theme.colors.textMuted} />
      </Pressable>
      <Text style={styles.fitTitle}>{fit.title || "Untitled fit"}</Text>
      {fit.occasion.length > 0 && (
        <View style={styles.occasionTag}>
          <Text style={styles.occasionTagText}>{fit.occasion}</Text>
        </View>
      )}
      {linkedPieces.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pieceRow}
        >
          {linkedPieces.map((piece) => {
            const uri = imageUriFor(piece);
            return (
              <View key={piece.id} style={styles.pieceThumbWrapper}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.pieceThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.pieceThumb, styles.pieceThumbFallback]} />
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
      {fit.why.length > 0 && <Text style={styles.fitBody}>{fit.why}</Text>}
      {fit.missing.length > 0 && (
        <Text style={styles.fitMissing}>Missing: {fit.missing}</Text>
      )}
    </View>
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
  heading: {
    fontSize: theme.typography.title2.fontSize,
    lineHeight: theme.typography.title2.lineHeight,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.text,
    fontFamily: theme.fonts.serif,
  },
  occasionInput: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundElevated,
  },
  sectionHeader: {
    gap: theme.spacing.xxs,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
  },
  emptyBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  fitList: {
    gap: theme.spacing.sm,
  },
  fitCard: {
    gap: theme.spacing.xxs,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  fitDelete: {
    position: "absolute",
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    padding: theme.spacing.xxs,
    zIndex: 1,
  },
  fitTitle: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
    paddingRight: theme.spacing.lg,
  },
  occasionTag: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.background,
  },
  occasionTagText: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.accent,
  },
  pieceRow: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  pieceThumbWrapper: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
  },
  pieceThumb: {
    width: 64,
    height: 64,
  },
  pieceThumbFallback: {
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  fitBody: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.text,
    marginTop: theme.spacing.xxs,
  },
  fitMissing: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xxs,
  },
  dock: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 0,
    backgroundColor: theme.colors.background,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  generateLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
});

