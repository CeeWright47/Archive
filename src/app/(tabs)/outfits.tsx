import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation, useRouter, type Href } from "expo-router";
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

import { ai } from "@/ai";
import { BottomDock } from "@/components/BottomDock";
import { PageTitle } from "@/components/PageTitle";
import { fits, type Fit } from "@/storage/fits";
import { imageSourceFor, pieces, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

export default function OutfitsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [occasion, setOccasion] = useState("");
  const [dockHeight, setDockHeight] = useState(0);
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

  // Re-tapping the Outfits tab while already on it clears the draft occasion
  // text and scrolls back to the top.
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as never, () => {
      if (!navigation.isFocused()) return;
      setOccasion("");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

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
        rating: null,
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
        <PageTitle>Build a fit</PageTitle>
        <TextInput
          style={styles.occasionInput}
          value={occasion}
          onChangeText={setOccasion}
          placeholder="Describe what you’re going for…"
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (occasion.trim()) handleGenerateFit();
          }}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved fits</Text>
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

      <BottomDock
        icon="sparkles-outline"
        label="Generate fit"
        accessibilityLabel="Generate fit"
        onPress={handleGenerateFit}
        loading={generating}
        onHeightChange={setDockHeight}
      />
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
            const source = imageSourceFor(piece, "thumb");
            return (
              <View key={piece.id} style={styles.pieceThumbWrapper}>
                {source ? (
                  <Image
                    source={source}
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
    gap: theme.spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
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
});
