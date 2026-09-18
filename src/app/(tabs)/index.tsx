import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
} from "react-native";

import { PieceLimitError } from "@/ai";
import {
    FREE_PIECE_LIMIT,
    FREE_PIECE_WARNING_AT,
    catalogPiecesFromLibrary,
} from "@/catalog/catalogPieces";
import { PageTitle } from "@/components/PageTitle";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { AddPiecesButton } from "@/components/wardrobe/AddPiecesButton";
import { PieceCard } from "@/components/wardrobe/PieceCard";
import { PieceDetailSheet } from "@/components/wardrobe/PieceDetailSheet";
import { SortSheet } from "@/components/wardrobe/SortSheet";
import { WardrobeHeader } from "@/components/wardrobe/WardrobeHeader";
import {
    ALL_PIECE_FITS,
    pieceFitsFor,
    type PieceFit,
} from "@/storage/fitVocabulary";
import { outfits } from "@/storage/outfits";
import { pieces, type Piece, type PieceCategory } from "@/storage/pieces";
import { profileStore, type Plan } from "@/storage/profile";
import type { Subcategory } from "@/storage/subcategories";
import {
    MIN_OUTFITS_FOR_WORN_SORT,
    WORN_SORTS,
    sortPieces,
    wardrobeSort,
    wearCountsFrom,
    type WardrobeSort,
} from "@/storage/wardrobeSort";
import { theme } from "@/theme/tokens";

function countBy<K extends string>(
  list: Piece[],
  key: (piece: Piece) => K | null,
) {
  const byOption = new Map<K, number>();
  for (const piece of list) {
    const k = key(piece);
    if (k !== null) byOption.set(k, (byOption.get(k) ?? 0) + 1);
  }
  return { all: list.length, byOption };
}

function matchesQuery(piece: Piece, query: string): boolean {
  if (!query) return true;
  const haystack = [
    piece.name,
    piece.color,
    piece.material,
    piece.subcategory ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export default function WardrobeScreen() {
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<PieceCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<WardrobeSort>("newest");
  const [fitFilter, setFitFilter] = useState<PieceFit | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [outfitPieceIds, setOutfitPieceIds] = useState<string[][]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [newPieceId, setNewPieceId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pieces.list().then(setAllPieces);
    profileStore.getUserProfile().then((profile) => setPlan(profile.plan));
    wardrobeSort.get().then(setSort);
    outfits
      .list()
      .then((list) => setOutfitPieceIds(list.map((o) => o.pieceIds)));
  }, []);

  const showWornSorts = outfitPieceIds.length >= MIN_OUTFITS_FOR_WORN_SORT;

  useEffect(() => {
    if (!showWornSorts && WORN_SORTS.includes(sort)) setSort("newest");
  }, [showWornSorts, sort]);

  const handleSortChange = useCallback((next: WardrobeSort) => {
    setSort(next);
    wardrobeSort.set(next).catch(() => {});
  }, []);

  // With no category, every fit word is offered; Shoes/Accessories have none.
  const fitOptions = useMemo<readonly PieceFit[]>(
    () =>
      selectedCategory === null
        ? ALL_PIECE_FITS
        : (pieceFitsFor(selectedCategory) ?? []),
    [selectedCategory],
  );

  useEffect(() => {
    if (fitFilter && !fitOptions.includes(fitFilter)) setFitFilter(null);
  }, [fitOptions, fitFilter]);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);

  // Header slides up by however far the list has scrolled, capped at its own height.
  const headerTranslateY = useMemo(
    () =>
      headerHeight > 0
        ? Animated.multiply(Animated.diffClamp(scrollY, 0, headerHeight), -1)
        : new Animated.Value(0),
    [scrollY, headerHeight],
  );

  const handleAddPieces = useCallback(async () => {
    if (plan === "free" && allPieces.length >= FREE_PIECE_LIMIT) {
      setUpgradeOpen(true);
      return;
    }
    setAdding(true);
    try {
      const created = await catalogPiecesFromLibrary((piece) =>
        setAllPieces((current) => [...current, piece]),
      );
      if (created[0]) {
        setNewPieceId(created[0].id);
        setSelectedPieceId(created[0].id);
      }
    } catch (error) {
      if (error instanceof PieceLimitError) {
        setUpgradeOpen(true);
        return;
      }
      Alert.alert(
        "Couldn’t add photos",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAdding(false);
    }
  }, [allPieces.length, plan]);

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

  const searched = useMemo(
    () => allPieces.filter((piece) => matchesQuery(piece, query.trim())),
    [allPieces, query],
  );
  const inCategory = useMemo(
    () =>
      selectedCategory === null
        ? searched
        : searched.filter((piece) => piece.category === selectedCategory),
    [searched, selectedCategory],
  );
  const wearCounts = useMemo(
    () => wearCountsFrom(outfitPieceIds),
    [outfitPieceIds],
  );
  const filteredPieces = useMemo(
    () =>
      sortPieces(
        inCategory.filter(
          (piece) =>
            (selectedSubcategory === null ||
              piece.subcategory === selectedSubcategory) &&
            (fitFilter === null || piece.fit === fitFilter),
        ),
        sort,
        wearCounts,
      ),
    [inCategory, selectedSubcategory, fitFilter, sort, wearCounts],
  );

  const categoryCounts = useMemo(
    () => countBy(searched, (p) => p.category),
    [searched],
  );
  const subcategoryCounts = useMemo(
    () => countBy(inCategory, (p) => p.subcategory),
    [inCategory],
  );

  const selectedPiece =
    allPieces.find((piece) => piece.id === selectedPieceId) ?? null;

  return (
    <View style={styles.container}>
      <WardrobeHeader
        query={query}
        onQueryChange={setQuery}
        category={selectedCategory}
        onCategoryChange={setSelectedCategory}
        subcategory={selectedSubcategory}
        onSubcategoryChange={setSelectedSubcategory}
        categoryCounts={categoryCounts}
        subcategoryCounts={subcategoryCounts}
        onSortPress={() => setSortOpen(true)}
        filterActive={fitFilter !== null}
        freeRemaining={
          plan === "free" && allPieces.length >= FREE_PIECE_WARNING_AT
            ? Math.max(FREE_PIECE_LIMIT - allPieces.length, 0)
            : undefined
        }
        translateY={headerTranslateY}
        onLayout={handleHeaderLayout}
      />

      <Animated.FlatList
        data={filteredPieces}
        keyExtractor={(piece) => piece.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.grid,
          { paddingTop: headerHeight + theme.spacing.sm },
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
          },
        )}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <PieceCard
            piece={item}
            showSubcategory={selectedCategory !== null}
            onPress={() => setSelectedPieceId(item.id)}
          />
        )}
        ListHeaderComponent={<PageTitle>Wardrobe</PageTitle>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyHeading}>
              {allPieces.length === 0 ? "No pieces yet" : "Nothing matches"}
            </Text>
            <Text style={styles.emptyBody}>
              {allPieces.length === 0
                ? "Add pieces from photos to start building your wardrobe."
                : "Try a different search or filter."}
            </Text>
          </View>
        }
      />

      <AddPiecesButton onPress={handleAddPieces} loading={adding} />

      <SortSheet
        visible={sortOpen}
        value={sort}
        showWornOptions={showWornSorts}
        onSelect={handleSortChange}
        fitOptions={fitOptions}
        fitValue={fitFilter}
        onFitChange={setFitFilter}
        onClose={() => setSortOpen(false)}
      />

      <PieceDetailSheet
        piece={selectedPiece}
        allPieces={allPieces}
        startInEditMode={selectedPieceId === newPieceId}
        onClose={() => {
          setSelectedPieceId(null);
          setNewPieceId(null);
        }}
        onSave={handleSavePiece}
        onDelete={handleDeletePiece}
      />
      <UpgradeSheet
        visible={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
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
