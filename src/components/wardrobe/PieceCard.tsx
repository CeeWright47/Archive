import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { imageUriFor, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

interface PieceCardProps {
  piece: Piece;
  onPress: () => void;
  /** With a category filter active the category is redundant, so show the subcategory instead. */
  showSubcategory?: boolean;
}

export function PieceCard({
  piece,
  onPress,
  showSubcategory = false,
}: PieceCardProps) {
  const uri = imageUriFor(piece);
  const detailLine = [piece.color, piece.material].filter(Boolean).join(" · ");
  const label = showSubcategory
    ? (piece.subcategory ?? piece.category)
    : piece.category;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${piece.name}, ${piece.subcategory ?? piece.category}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.imageWrapper}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
      </View>
      <Text selectable={false} style={styles.category} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Text selectable={false} style={styles.name} numberOfLines={2}>
        {piece.name}
      </Text>
      {detailLine.length > 0 && (
        <Text selectable={false} style={styles.detail} numberOfLines={1}>
          {detailLine}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: theme.spacing.xxs,
    userSelect: "none",
  },
  imageWrapper: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundElevated,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  imageFallback: {
    backgroundColor: theme.colors.backgroundElevated,
  },
  category: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
    letterSpacing: 0.5,
    userSelect: "none",
  },
  name: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.text,
    userSelect: "none",
  },
  detail: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
    userSelect: "none",
  },
});
