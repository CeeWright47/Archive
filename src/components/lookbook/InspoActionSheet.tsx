import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { imageSourceForInspo, type InspoImage } from "@/storage/inspo";
import { theme } from "@/theme/tokens";

interface InspoActionSheetProps {
  entry: InspoImage | null;
  onClose: () => void;
  onGenerateFit: (entry: InspoImage) => void;
}

export function InspoActionSheet({
  entry,
  onClose,
  onGenerateFit,
}: InspoActionSheetProps) {
  if (!entry) return null;
  const source = imageSourceForInspo(entry, "thumb");

  return (
    <BottomSheet onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.thumbWrapper}>
          {source ? (
            <Image source={source} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
        </View>
        <Text style={styles.headerCopy} numberOfLines={3}>
          {entry.vibe.length > 0 ? entry.vibe : "Inspiration photo"}
        </Text>
      </View>
      <View style={styles.divider} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Generate fit based off this"
        onPress={() => onGenerateFit(entry)}
        style={styles.row}
      >
        <Text style={styles.rowTitle}>Generate fit based off this</Text>
        <Text style={styles.rowDescription}>
          Builds an outfit from your closet to resemble this photo, using
          matching or similar pieces.
        </Text>
      </Pressable>
    </BottomSheet>
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
  rowDescription: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "left",
  },
});
