import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { imageUriForOutfit, type Outfit } from "@/storage/outfits";
import { theme } from "@/theme/tokens";

interface OutfitCardProps {
  outfit: Outfit;
  onPress: () => void;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export function OutfitCard({ outfit, onPress }: OutfitCardProps) {
  const uri = imageUriForOutfit(outfit);
  const extraImageCount = outfit.imageIds.length - 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Outfit from ${formatDate(outfit.dateWorn)}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.imageWrapper}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons
              name="shirt-outline"
              size={theme.spacing.xl}
              color={theme.colors.textMuted}
            />
          </View>
        )}
        {extraImageCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>+{extraImageCount}</Text>
          </View>
        ) : null}
        {outfit.inInspo ? (
          <View style={styles.inspoBadge}>
            <Text style={styles.inspoText}>INSPO</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.details}>
        <Text style={styles.date}>{formatDate(outfit.dateWorn)}</Text>
        {outfit.occasion ? (
          <Text style={styles.occasion} numberOfLines={1}>
            {outfit.occasion}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundElevated,
  },
  imageWrapper: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    position: "absolute",
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
    backgroundColor: theme.colors.backgroundElevated,
  },
  countText: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.colors.text,
  },
  inspoBadge: {
    position: "absolute",
    top: theme.spacing.xs,
    left: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
    backgroundColor: theme.colors.accent,
  },
  inspoText: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
  details: {
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  date: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.accent,
  },
  occasion: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
});
