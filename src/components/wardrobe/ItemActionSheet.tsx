import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { imageUriFor, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

interface ItemActionSheetProps {
  piece: Piece | null;
  onClose: () => void;
  onBuildFit: (piece: Piece) => void;
  onShowPairings: (piece: Piece) => void;
  onEdit: (piece: Piece) => void;
  onRemove: (piece: Piece) => void;
}

export function ItemActionSheet({
  piece,
  onClose,
  onBuildFit,
  onShowPairings,
  onEdit,
  onRemove,
}: ItemActionSheetProps) {
  if (!piece) return null;
  const uri = imageUriFor(piece);
  const detailLine = [piece.color, piece.material].filter(Boolean).join(" · ");

  return (
    <BottomSheet onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.thumbWrapper}>
          {uri ? (
            <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.category} numberOfLines={1}>
            {piece.category.toUpperCase()}
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {piece.name}
          </Text>
          {detailLine.length > 0 && (
            <Text style={styles.detail} numberOfLines={1}>
              {detailLine}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.divider} />
      <ActionRow
        title="Build a fit around this"
        description="Generates an outfit with this piece as the centerpiece."
        onPress={() => onBuildFit(piece)}
      />
      <View style={styles.divider} />
      <ActionRow
        title="What it pairs with"
        description="See what in your closet goes with this piece."
        onPress={() => onShowPairings(piece)}
      />
      <View style={styles.divider} />
      <ActionRow
        title="Edit details"
        description="Change the name, category, color, material, and fit."
        onPress={() => onEdit(piece)}
      />
      <View style={styles.divider} />
      <ActionRow
        title="Remove from closet"
        description="Delete this piece permanently."
        onPress={() => onRemove(piece)}
        destructive
      />
    </BottomSheet>
  );
}

function ActionRow({
  title,
  description,
  onPress,
  destructive = false,
}: {
  title: string;
  description: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}>
        {title}
      </Text>
      <Text style={styles.rowDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    paddingRight: theme.spacing.xxl,
  },
  thumbWrapper: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.md,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
    alignItems: "flex-start",
  },
  category: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
  },
  name: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    color: theme.colors.text,
  },
  detail: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  row: {
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xxs,
  },
  rowTitle: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
    textAlign: "left",
  },
  rowTitleDestructive: {
    color: theme.colors.danger,
  },
  rowDescription: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "left",
  },
});
