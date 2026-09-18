import { Ionicons } from "@expo/vector-icons";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type LayoutChangeEvent,
} from "react-native";

import { PIECE_CATEGORIES, type PieceCategory } from "@/storage/pieces";
import { subcategoriesFor, type Subcategory } from "@/storage/subcategories";
import { theme } from "@/theme/tokens";
import { CategoryChips } from "./CategoryChips";

interface WardrobeHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  category: PieceCategory | null;
  onCategoryChange: (category: PieceCategory | null) => void;
  subcategory: Subcategory | null;
  onSubcategoryChange: (subcategory: Subcategory | null) => void;
  categoryCounts: { all: number; byOption: ReadonlyMap<PieceCategory, number> };
  subcategoryCounts: {
    all: number;
    byOption: ReadonlyMap<Subcategory, number>;
  };
  onSortPress: () => void;
  filterActive?: boolean;
  freeRemaining?: number;
  translateY: Animated.AnimatedInterpolation<number> | Animated.Value;
  onLayout: (event: LayoutChangeEvent) => void;
}

// Absolutely positioned so it can slide up out of view as the grid scrolls down.
export function WardrobeHeader({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  subcategory,
  onSubcategoryChange,
  categoryCounts,
  subcategoryCounts,
  onSortPress,
  filterActive = false,
  freeRemaining,
  translateY,
  onLayout,
}: WardrobeHeaderProps) {
  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.header, { transform: [{ translateY }] }]}
    >
      <View style={styles.topRow}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={theme.spacing.md + 2}
            color={theme.colors.textMuted}
          />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search name, color, material…"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            selectionColor={theme.colors.accent}
            style={styles.searchInput}
            accessibilityLabel="Search wardrobe"
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={theme.spacing.xs}
              onPress={() => onQueryChange("")}
            >
              <Ionicons
                name="close-circle"
                size={theme.spacing.md + 2}
                color={theme.colors.textMuted}
              />
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            filterActive ? "Sort and filter, filter active" : "Sort and filter"
          }
          hitSlop={theme.spacing.xs}
          onPress={onSortPress}
          style={styles.sortButton}
        >
          <Ionicons
            name="swap-vertical"
            size={theme.spacing.md + 2}
            color={theme.colors.text}
          />
          {filterActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      <CategoryChips
        categories={PIECE_CATEGORIES}
        selected={category}
        onSelect={(next) => {
          onCategoryChange(next);
          onSubcategoryChange(null);
        }}
        counts={categoryCounts}
      />

      {freeRemaining !== undefined ? (
        <Text style={styles.remaining}>
          {freeRemaining === 0
            ? "Free limit reached"
            : `${freeRemaining} free piece${freeRemaining === 1 ? "" : "s"} remaining`}
        </Text>
      ) : null}

      {category && (
        <CategoryChips
          categories={subcategoriesFor(category)}
          selected={subcategory}
          onSelect={onSubcategoryChange}
          counts={subcategoryCounts}
          compact
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    minHeight: 40,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.text,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  remaining: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
    textAlign: "right",
  },
});
