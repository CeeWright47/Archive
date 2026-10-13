import { useNavigation, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
} from "react-native";
import type { FlatList } from "react-native";
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { ai, PieceLimitError } from "@/ai";
import {
    FREE_PIECE_LIMIT,
    FREE_PIECE_WARNING_AT,
    catalogPiecesFromLibrary,
} from "@/catalog/catalogPieces";
import { ArchiveLoadingScreen } from "@/components/ArchiveLoadingScreen";
import { BottomDock } from "@/components/BottomDock";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { ItemActionSheet } from "@/components/wardrobe/ItemActionSheet";
import { PieceCard } from "@/components/wardrobe/PieceCard";
import { PieceDetailSheet } from "@/components/wardrobe/PieceDetailSheet";
import { SortSheet } from "@/components/wardrobe/SortSheet";
import { WardrobeHeader } from "@/components/wardrobe/WardrobeHeader";
import { fits, type Fit } from "@/storage/fits";
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

const HEADER_SNAP_DURATION_MS = 220;

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
  const router = useRouter();
  const navigation = useNavigation();
  const listRef = useRef<FlatList<Piece>>(null);
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
  const [forceEditPieceId, setForceEditPieceId] = useState<string | null>(
    null,
  );
  const [actionsPieceId, setActionsPieceId] = useState<string | null>(null);
  const [buildingFitFor, setBuildingFitFor] = useState<Piece | null>(null);
  const [adding, setAdding] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [headerHeight, setHeaderHeight] = useState(0);
  const [dockHeight, setDockHeight] = useState(0);

  // 0 = header fully visible, -headerHeight = fully hidden. Driven entirely
  // on the UI thread: translateY tracks the scroll delta 1:1 while clamped
  // to that range, overscroll (contentOffset.y < 0 or past the bottom) is
  // ignored rather than fed in as a delta, and a release/momentum-end snaps
  // to whichever end is closer instead of resting mid-way.
  const headerTranslateY = useSharedValue(0);
  const headerHeightShared = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  // A chip toggle (category/subcategory) can only happen while the header is
  // at least partly visible, and it can change the header's own height (the
  // subcategory row appearing/disappearing). Without this, headerTranslateY
  // keeps whatever pixel offset it had under the OLD height, so the newly
  // resized header no longer lines up with that offset — on the next scroll
  // it can settle mid-way, leaving it overlapping the grid instead of fully
  // shown or fully hidden. Snapping back to fully shown whenever the height
  // changes keeps the two in sync; it's a no-op when already fully shown.
  useEffect(() => {
    headerHeightShared.value = headerHeight;
    headerTranslateY.value = withTiming(0, {
      duration: HEADER_SNAP_DURATION_MS,
    });
  }, [headerHeight, headerHeightShared, headerTranslateY]);

  const snapHeader = () => {
    "worklet";
    const max = headerHeightShared.value;
    if (max <= 0) return;
    const shouldHide = headerTranslateY.value < -max / 2;
    headerTranslateY.value = withTiming(shouldHide ? -max : 0, {
      duration: HEADER_SNAP_DURATION_MS,
    });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const maxOffset = Math.max(
        0,
        event.contentSize.height - event.layoutMeasurement.height,
      );
      if (y <= 0) {
        // At or past the top (including pull-down bounce) — fully shown.
        headerTranslateY.value = 0;
        lastScrollY.value = 0;
        return;
      }
      if (y >= maxOffset) {
        // Bottom bounce — don't move the header, but keep the baseline
        // current so the next real delta (once the bounce settles) is sane.
        lastScrollY.value = maxOffset;
        return;
      }
      const delta = y - lastScrollY.value;
      lastScrollY.value = y;
      const max = headerHeightShared.value;
      const next = headerTranslateY.value - delta;
      headerTranslateY.value = Math.min(0, Math.max(-max, next));
    },
    onEndDrag: () => {
      snapHeader();
    },
    onMomentumEnd: () => {
      snapHeader();
    },
  });

  useEffect(() => {
    pieces.list().then(setAllPieces);
    profileStore.getUserProfile().then((profile) => setPlan(profile.plan));
    wardrobeSort.get().then(setSort);
    outfits
      .list()
      .then((list) => setOutfitPieceIds(list.map((o) => o.pieceIds)));
  }, []);

  // Re-tapping the Wardrobe tab while already on it clears the search/filter
  // state and scrolls back to the top, rather than leaving the screen as-is.
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as never, () => {
      if (!navigation.isFocused()) return;
      setQuery("");
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setFitFilter(null);
      headerTranslateY.value = withTiming(0, {
        duration: HEADER_SNAP_DURATION_MS,
      });
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation, headerTranslateY]);

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
    setForceEditPieceId(null);
  }, []);

  const confirmRemoveFromActions = useCallback(
    (piece: Piece) => {
      Alert.alert(
        `Remove ${piece.name}?`,
        "This also removes it from any saved fits.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => handleDeletePiece(piece.id),
          },
        ],
      );
    },
    [handleDeletePiece],
  );

  const handleEditFromActions = useCallback((piece: Piece) => {
    setForceEditPieceId(piece.id);
    setSelectedPieceId(piece.id);
  }, []);

  const handleShowPairings = useCallback(
    async (piece: Piece) => {
      try {
        const result = await ai.suggestPairings(piece.id);
        const names = allPieces
          .filter((candidate) => result.pair_ids.includes(candidate.id))
          .map((candidate) => candidate.name)
          .join(" · ");
        Alert.alert(
          "What it pairs with",
          [result.sentence, names].filter(Boolean).join("\n\n"),
        );
      } catch (error) {
        Alert.alert(
          "Couldn’t find pairings",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    },
    [allPieces],
  );

  const handleBuildFitAround = useCallback(
    async (piece: Piece) => {
      setBuildingFitFor(piece);
      try {
        const result = await ai.generateFit("", piece.id);
        const fit: Fit = {
          id: `fit_${Date.now().toString(36)}`,
          title: result.title,
          occasion: "Everyday",
          pieceIds: [...result.piece_ids, ...result.optional_piece_ids],
          why: result.why,
          missing: result.missing ?? "",
          styleProfileId: result.style_profile_id,
          styleProfileName: result.style_profile_name,
          rating: null,
          saved: Date.now(),
        };
        await fits.save(fit);
        router.push(`/outfits/${fit.id}` as Href);
      } catch (error) {
        Alert.alert(
          "Couldn’t generate a fit",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setBuildingFitFor(null);
      }
    },
    [router],
  );

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
  const actionsPiece =
    allPieces.find((piece) => piece.id === actionsPieceId) ?? null;

  if (buildingFitFor) return <ArchiveLoadingScreen showTip={false} />;

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
        ref={listRef}
        data={filteredPieces}
        keyExtractor={(piece) => piece.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: dockHeight },
        ]}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <PieceCard
            piece={item}
            showSubcategory={selectedCategory !== null}
            onPress={() => setSelectedPieceId(item.id)}
            onActionsPress={() => setActionsPieceId(item.id)}
          />
        )}
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

      <BottomDock
        icon="add-circle-outline"
        label="Add pieces from photos"
        accessibilityLabel="Add pieces from photos"
        onPress={handleAddPieces}
        loading={adding}
        onHeightChange={setDockHeight}
      />

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
        startInEditMode={
          selectedPieceId === newPieceId || selectedPieceId === forceEditPieceId
        }
        onClose={() => {
          setSelectedPieceId(null);
          setNewPieceId(null);
          setForceEditPieceId(null);
        }}
        onSave={handleSavePiece}
        onDelete={handleDeletePiece}
      />
      <ItemActionSheet
        piece={actionsPiece}
        onClose={() => setActionsPieceId(null)}
        onBuildFit={(piece) => {
          setActionsPieceId(null);
          handleBuildFitAround(piece);
        }}
        onShowPairings={(piece) => {
          setActionsPieceId(null);
          handleShowPairings(piece);
        }}
        onEdit={(piece) => {
          setActionsPieceId(null);
          handleEditFromActions(piece);
        }}
        onRemove={(piece) => {
          setActionsPieceId(null);
          confirmRemoveFromActions(piece);
        }}
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
    paddingTop: theme.spacing.sm,
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
