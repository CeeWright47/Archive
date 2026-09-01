import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { AddPiecesButton } from "@/components/wardrobe/AddPiecesButton";
import { CategoryChips } from "@/components/wardrobe/CategoryChips";
import { PieceCard } from "@/components/wardrobe/PieceCard";
import { PieceDetailSheet } from "@/components/wardrobe/PieceDetailSheet";
import { pickImage } from "@/media/pickImage";
import { images } from "@/storage/images";
import {
    PIECE_CATEGORIES,
    generatePieceId,
    pieces,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";
import { theme } from "@/theme/tokens";

const DEFAULT_CATEGORY: PieceCategory = PIECE_CATEGORIES[0];

export default function WardrobeScreen() {
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<PieceCategory | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [newPieceId, setNewPieceId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    pieces.list().then(setAllPieces);
  }, []);

  const handleAddPieces = useCallback(async () => {
    setAdding(true);
    try {
      const picked = await pickImage.manyFromLibrary();
      if (picked.length === 0) return;

      const created: Piece[] = picked.map((asset, index) => {
        const id = generatePieceId();
        images.saveFromUri(id, asset.uri);
        return {
          id,
          name: "New piece",
          category: DEFAULT_CATEGORY,
          color: "",
          material: "",
          createdAt: Date.now() + index,
        };
      });

      for (const piece of created) {
        await pieces.save(piece);
      }

      setAllPieces((current) => [...current, ...created]);
      setNewPieceId(created[0].id);
      setSelectedPieceId(created[0].id);
    } catch (error) {
      Alert.alert(
        "Couldn’t add photos",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAdding(false);
    }
  }, []);

  const handleSavePiece = useCallback(async (updated: Piece) => {
    await pieces.save(updated);
    setAllPieces((current) =>
      current.map((p) => (p.id === updated.id ? updated : p)),
    );
    setNewPieceId(null);
  }, []);

  const handleDeletePiece = useCallback(async (id: string) => {
    await pieces.remove(id);
    setAllPieces((current) => current.filter((p) => p.id !== id));
    setSelectedPieceId(null);
    setNewPieceId(null);
  }, []);

  const filteredPieces = allPieces
    .filter(
      (piece) =>
        selectedCategory === null || piece.category === selectedCategory,
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const selectedPiece =
    allPieces.find((piece) => piece.id === selectedPieceId) ?? null;

  return (
    <View style={styles.container}>
      <CategoryChips
        categories={PIECE_CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <FlatList
        data={filteredPieces}
        keyExtractor={(piece) => piece.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <PieceCard piece={item} onPress={() => setSelectedPieceId(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyHeading}>No pieces yet</Text>
            <Text style={styles.emptyBody}>
              Add pieces from photos to start building your wardrobe.
            </Text>
          </View>
        }
      />

      <AddPiecesButton onPress={handleAddPieces} loading={adding} />

      <PieceDetailSheet
        piece={selectedPiece}
        startInEditMode={selectedPieceId === newPieceId}
        onClose={() => {
          setSelectedPieceId(null);
          setNewPieceId(null);
        }}
        onSave={handleSavePiece}
        onDelete={handleDeletePiece}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
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
});
