import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { imageUriForInspo, type InspoImage } from "@/storage/inspo";
import { theme } from "@/theme/tokens";

interface InspoDetailSheetProps {
  entry: InspoImage | null;
  onClose: () => void;
}

// Full, uncropped view of an inspiration photo — the grid thumbnail crops to
// a 3:4 card, this shows the whole outfit.
export function InspoDetailSheet({ entry, onClose }: InspoDetailSheetProps) {
  if (!entry) return null;
  const uri = imageUriForInspo(entry);

  return (
    <BottomSheet onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.imageWrapper}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} contentFit="contain" />
          ) : (
            <View style={[styles.image, styles.imageFallback]} />
          )}
        </View>
        {entry.vibe.length > 0 && (
          <Text style={styles.vibe}>{entry.vibe}</Text>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  imageWrapper: {
    width: "100%",
    height: 480,
    borderRadius: theme.radii.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    backgroundColor: theme.colors.background,
  },
  vibe: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
});
