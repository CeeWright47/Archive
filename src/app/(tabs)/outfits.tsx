import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { AddOutfitButton } from "@/components/outfits/AddOutfitButton";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { OutfitDetailSheet } from "@/components/outfits/OutfitDetailSheet";
import { pickImage, type PickedImage } from "@/media/pickImage";
import { images } from "@/storage/images";
import {
    generateOutfitId,
    generateOutfitImageId,
    outfits,
    type Outfit,
} from "@/storage/outfits";
import { pieces, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OutfitsScreen() {
  const [allOutfits, setAllOutfits] = useState<Outfit[]>([]);
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [newOutfitId, setNewOutfitId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [choosingSource, setChoosingSource] = useState(false);

  useEffect(() => {
    Promise.all([outfits.list(), pieces.list()]).then(
      ([storedOutfits, storedPieces]) => {
        setAllOutfits(storedOutfits);
        setAllPieces(storedPieces);
      },
    );
  }, []);

  const savePickedImages = useCallback(async (picked: PickedImage[]) => {
    if (picked.length === 0) return;
    setAdding(true);
    try {
      const selected = picked.slice(0, 3);
      const imageIds: string[] = [];
      for (const asset of selected) {
        const imageId = generateOutfitImageId();
        await images.saveFromUri(imageId, asset.uri);
        imageIds.push(imageId);
      }

      const outfit: Outfit = {
        id: generateOutfitId(),
        userId: null,
        sourceType: "self-photo",
        imageIds,
        dateWorn: today(),
        pieceIds: [],
        profileTag: null,
        occasion: "",
        note: "",
        inInspo: false,
        added: Date.now(),
      };
      await outfits.save(outfit);
      setAllOutfits((current) => [...current, outfit]);
      setNewOutfitId(outfit.id);
      setSelectedOutfitId(outfit.id);
    } catch (error) {
      Alert.alert(
        "Couldn’t add outfit",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAdding(false);
    }
  }, []);

  const handlePickSource = useCallback(
    async (source: "camera" | "library") => {
      setChoosingSource(false);
      try {
        const picked =
          source === "camera"
            ? await pickImage.fromCamera()
            : await pickImage.manyFromLibrary();
        await savePickedImages(
          Array.isArray(picked) ? picked : picked ? [picked] : [],
        );
      } catch (error) {
        Alert.alert(
          "Couldn’t open photos",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    },
    [savePickedImages],
  );

  const handleSaveOutfit = useCallback(async (updated: Outfit) => {
    await outfits.save(updated);
    setAllOutfits((current) =>
      current.map((outfit) => (outfit.id === updated.id ? updated : outfit)),
    );
    setNewOutfitId(null);
  }, []);

  const handleDeleteOutfit = useCallback(async (id: string) => {
    await outfits.remove(id);
    setAllOutfits((current) => current.filter((outfit) => outfit.id !== id));
    setSelectedOutfitId(null);
    setNewOutfitId(null);
  }, []);

  const sortedOutfits = [...allOutfits].sort((a, b) => b.added - a.added);
  const selectedOutfit =
    allOutfits.find((outfit) => outfit.id === selectedOutfitId) ?? null;

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedOutfits}
        keyExtractor={(outfit) => outfit.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <OutfitCard
            outfit={item}
            onPress={() => setSelectedOutfitId(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyHeading}>No outfits logged</Text>
            <Text style={styles.emptyBody}>
              Add a photo to start your outfit journal.
            </Text>
          </View>
        }
      />

      <AddOutfitButton
        onPress={() => setChoosingSource(true)}
        loading={adding}
      />

      <Modal
        visible={choosingSource}
        animationType="fade"
        transparent
        onRequestClose={() => setChoosingSource(false)}
      >
        <View style={styles.sourceModal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo source chooser"
            style={styles.sourceBackdrop}
            onPress={() => setChoosingSource(false)}
          />
          <View style={styles.sourceSheet}>
            <Text style={styles.sourceHeading}>Add outfit</Text>
            <Text style={styles.sourceBody}>
              Choose where to get your photo.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.sourcePrimaryButton}
              onPress={() => handlePickSource("camera")}
            >
              <Text style={styles.sourcePrimaryLabel}>Take photo</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.sourceSecondaryButton}
              onPress={() => handlePickSource("library")}
            >
              <Text style={styles.sourceSecondaryLabel}>Photo library</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <OutfitDetailSheet
        outfit={selectedOutfit}
        pieces={allPieces}
        startInEditMode={selectedOutfitId === newOutfitId}
        onClose={() => {
          setSelectedOutfitId(null);
          setNewOutfitId(null);
        }}
        onSave={handleSaveOutfit}
        onDelete={handleDeleteOutfit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.sm,
  },
  grid: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  column: {
    gap: theme.spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyHeading: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  sourceModal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sourceBackdrop: {
    position: "absolute",
    top: theme.spacing.none,
    right: theme.spacing.none,
    bottom: theme.spacing.none,
    left: theme.spacing.none,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sourceSheet: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    backgroundColor: theme.colors.backgroundElevated,
  },
  sourceHeading: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
  },
  sourceBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xxs,
  },
  sourcePrimaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
  },
  sourcePrimaryLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
  sourceSecondaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
  },
  sourceSecondaryLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
});
