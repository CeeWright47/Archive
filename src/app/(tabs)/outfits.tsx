import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

import { ai } from "@/ai";
import { fits, type Fit } from "@/storage/fits";
import { imageUriFor, pieces, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

export default function OutfitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [occasion, setOccasion] = useState("");
  const [allFits, setAllFits] = useState<Fit[]>([]);
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const assigningStyles = useRef(false);

  async function assignMissingStyleLabels(storedFits: Fit[]) {
    if (
      assigningStyles.current ||
      !storedFits.some((fit) => fit.styleProfileName === null)
    ) {
      return;
    }
    assigningStyles.current = true;
    try {
      const result = await ai.assignExistingFitStyles();
      const assignments = new Map(
        result.assignments.map((assignment) => [assignment.fit_id, assignment]),
      );
      setAllFits((current) =>
        current.map((fit) => {
          const assignment = assignments.get(fit.id);
          return assignment && fit.styleProfileName === null
            ? {
                ...fit,
                styleProfileId: assignment.style_profile_id,
                styleProfileName: assignment.style_profile_name,
              }
            : fit;
        }),
      );
    } catch (assignmentError) {
      console.error("Couldn’t assign existing fit styles", assignmentError);
    } finally {
      assigningStyles.current = false;
    }
  }

  async function load() {
    try {
      setError(null);
      const [storedFits, storedPieces] = await Promise.all([
        fits.list(),
        pieces.list(),
      ]);
      setAllFits(storedFits);
      setAllPieces(storedPieces);
      void assignMissingStyleLabels(storedFits);
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

  async function handleGenerateFit() {
    if (allPieces.length < 3) {
      Alert.alert(
        "Add more pieces",
        "Add at least 3 pieces before generating a fit.",
      );
      return;
    }
    setGenerating(true);
    try {
      const result = await ai.generateFit(occasion.trim());
      const fit: Fit = {
        id: `fit_${Date.now().toString(36)}`,
        title: result.title,
        occasion: occasion.trim() || "Everyday",
        pieceIds: [...result.piece_ids, ...result.optional_piece_ids],
        why: result.why,
        missing: result.missing ?? "",
        styleProfileId: result.style_profile_id,
        styleProfileName: result.style_profile_name,
        saved: Date.now(),
      };
      await fits.save(fit);
      setAllFits((current) => [fit, ...current]);
    } catch (error) {
      Alert.alert(
        "Couldn’t generate a fit",
        error instanceof Error ? error.message : "Please try again.",
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
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
            fit to open it.
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
                onPress={() => router.push(`/outfits/${fit.id}` as Href)}
              />
            ))}
          </View>
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
  onPress,
}: {
  fit: Fit;
  pieces: Piece[];
  onPress: () => void;
}) {
  const linkedPieces = fit.pieceIds
    .map((id) => allPieces.find((piece) => piece.id === id))
    .filter((piece): piece is Piece => piece != null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${fit.title || "fit"}`}
      onPress={onPress}
      style={styles.fitCard}
    >
      <View style={styles.fitCardHeader}>
        <View style={styles.fitCardTitle}>
          <Text style={styles.fitTitle} numberOfLines={1}>
            {fit.title || "Untitled fit"}
          </Text>
          {fit.occasion.length > 0 && (
            <Text style={styles.fitMeta} numberOfLines={1}>
              {fit.styleProfileName ?? "Assigning style"} · {fit.occasion}
            </Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textMuted}
        />
      </View>
      {linkedPieces.length > 0 && (
        <View style={styles.pieceRow}>
          {linkedPieces.slice(0, 5).map((piece) => {
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
                  <View
                    style={[styles.pieceThumb, styles.pieceThumbFallback]}
                  />
                )}
              </View>
            );
          })}
          {linkedPieces.length > 5 ? (
            <View style={[styles.pieceThumb, styles.morePieces]}>
              <Text style={styles.morePiecesText}>
                +{linkedPieces.length - 5}
              </Text>
            </View>
          ) : null}
        </View>
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
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  fitCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  fitCardTitle: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  fitTitle: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
  fitMeta: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.accent,
    textTransform: "uppercase",
  },
  pieceRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  pieceThumbWrapper: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
  },
  pieceThumb: {
    width: 52,
    height: 52,
  },
  pieceThumbFallback: {
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  morePieces: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.background,
  },
  morePiecesText: {
    fontSize: theme.typography.caption1.fontSize,
    color: theme.colors.textMuted,
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
