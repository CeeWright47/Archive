import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { fits, type Fit } from "@/storage/fits";
import { imageUriFor, pieces, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

export default function OutfitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fit, setFit] = useState<Fit | null>(null);
  const [linkedPieces, setLinkedPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([fits.get(id), pieces.list()])
      .then(([storedFit, allPieces]) => {
        if (!storedFit)
          throw new Error("This lookbook entry no longer exists.");
        setFit(storedFit);
        setLinkedPieces(
          storedFit.pieceIds
            .map((pieceId) => allPieces.find((piece) => piece.id === pieceId))
            .filter((piece): piece is Piece => piece != null),
        );
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Couldn’t load this fit.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  function handleDelete() {
    if (!fit) return;
    Alert.alert("Delete this fit?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fits.remove(fit.id);
            router.back();
          } catch (deleteError) {
            Alert.alert(
              "Couldn’t delete fit",
              deleteError instanceof Error
                ? deleteError.message
                : "Please try again.",
            );
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error || !fit) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Couldn’t load this fit."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: fit.title || "Lookbook" }} />
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.occasion}>{fit.occasion || "Everyday"}</Text>
          <Text style={styles.title}>{fit.title || "Untitled fit"}</Text>
          <Text style={styles.styleProfile}>
            {fit.styleProfileName ?? "Assigning style"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${fit.title || "fit"}`}
          onPress={handleDelete}
          style={styles.deleteButton}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={theme.colors.danger}
          />
        </Pressable>
      </View>

      <View style={styles.pieceGrid}>
        {linkedPieces.map((piece) => {
          const uri = imageUriFor(piece);
          return (
            <View key={piece.id} style={styles.piece}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.pieceImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.pieceImage, styles.imageFallback]} />
              )}
              <Text style={styles.pieceName} numberOfLines={2}>
                {piece.name}
              </Text>
            </View>
          );
        })}
      </View>

      {fit.why ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHY IT WORKS</Text>
          <Text style={styles.body}>{fit.why}</Text>
        </View>
      ) : null}
      {fit.missing ? (
        <View style={styles.missing}>
          <Text style={styles.sectionLabel}>WORTH HUNTING</Text>
          <Text style={styles.body}>{fit.missing}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  error: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body.fontSize,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  headingCopy: { flex: 1, gap: theme.spacing.xxs },
  occasion: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title1.fontSize,
    lineHeight: theme.typography.title1.lineHeight,
  },
  styleProfile: {
    alignSelf: "flex-start",
    color: theme.colors.text,
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accentMuted,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.md,
  },
  pieceGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  piece: { width: "47%", gap: theme.spacing.xs },
  pieceImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: theme.radii.md,
  },
  imageFallback: { backgroundColor: theme.colors.backgroundElevated },
  pieceName: {
    color: theme.colors.text,
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
  },
  section: { gap: theme.spacing.xs },
  sectionLabel: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
  },
  body: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  missing: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderColor: theme.colors.accentMuted,
    borderRadius: theme.radii.md,
  },
});
