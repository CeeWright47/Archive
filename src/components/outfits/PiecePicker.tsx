import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CategoryChips } from "@/components/wardrobe/CategoryChips";
import {
    PIECE_CATEGORIES,
    imageSourceFor,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";
import { theme } from "@/theme/tokens";

interface PiecePickerProps {
  pieces: Piece[];
  selectedIds: string[];
  /** Ids the AI suggested, marked until the person confirms or removes them. */
  suggestedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onDone: () => void;
}

function matchesQuery(piece: Piece, query: string): boolean {
  if (!query) return true;
  const haystack = [
    piece.name,
    piece.brand ?? "",
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
    .every((word) => haystack.includes(word));
}

/**
 * Full-sheet page for tagging closet pieces on an outfit: search, category
 * pills, and the closet list, with selected pieces pinned on top so they
 * stay visible whatever filter is active.
 */
export function PiecePicker({
  pieces,
  selectedIds,
  suggestedIds,
  onToggle,
  onDone,
}: PiecePickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PieceCategory | null>(null);

  const selected = useMemo(
    () => pieces.filter((piece) => selectedIds.includes(piece.id)),
    [pieces, selectedIds],
  );
  const searched = useMemo(
    () => pieces.filter((piece) => matchesQuery(piece, query.trim())),
    [pieces, query],
  );
  const counts = useMemo(() => {
    const byOption = new Map<PieceCategory, number>();
    for (const piece of searched) {
      byOption.set(piece.category, (byOption.get(piece.category) ?? 0) + 1);
    }
    return { all: searched.length, byOption };
  }, [searched]);
  const results = searched.filter(
    (piece) =>
      !selectedIds.includes(piece.id) &&
      (category === null || piece.category === category),
  );

  function handleToggle(id: string) {
    // Picking something resets the filters so the next piece is easy to find.
    if (!selectedIds.includes(id)) {
      setQuery("");
      setCategory(null);
    }
    onToggle(id);
  }

  const countLabel = `${selected.length} piece${selected.length === 1 ? "" : "s"}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tag pieces</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Done, ${countLabel} selected`}
          onPress={onDone}
          hitSlop={theme.spacing.xs}
          style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        >
          <Text style={styles.doneText}>Done · {countLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={theme.spacing.md + 2}
          color={theme.colors.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, brand, color…"
          placeholderTextColor={theme.colors.textMuted}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <CategoryChips
        categories={PIECE_CATEGORIES}
        selected={category}
        onSelect={setCategory}
        counts={counts}
        compact
      />

      {selected.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>SELECTED</Text>
          {selected.map((piece) => (
            <PieceRow
              key={piece.id}
              piece={piece}
              selected
              suggested={suggestedIds.has(piece.id)}
              onPress={() => handleToggle(piece.id)}
            />
          ))}
        </View>
      )}

      <View style={styles.group}>
        {selected.length > 0 && <Text style={styles.groupLabel}>CLOSET</Text>}
        {results.length > 0 ? (
          results.map((piece) => (
            <PieceRow
              key={piece.id}
              piece={piece}
              selected={false}
              suggested={false}
              onPress={() => handleToggle(piece.id)}
            />
          ))
        ) : (
          <Text style={styles.empty}>
            {pieces.length === 0 ? "No wardrobe pieces yet." : "Nothing matches."}
          </Text>
        )}
      </View>
    </View>
  );
}

function PieceRow({
  piece,
  selected,
  suggested,
  onPress,
}: {
  piece: Piece;
  selected: boolean;
  suggested: boolean;
  onPress: () => void;
}) {
  const source = imageSourceFor(piece, "thumb");
  const detail = [piece.color, piece.brand].filter(Boolean).join(" · ");
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={piece.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {source ? (
        <Image source={source} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <View style={styles.rowCopy}>
        <Text style={styles.rowName} numberOfLines={1}>
          {piece.name}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {suggested ? "Suggested" : detail || piece.category}
        </Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={theme.spacing.lg}
        color={selected ? theme.colors.accent : theme.colors.textMuted}
      />
    </Pressable>
  );
}

const THUMB_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  group: {
    gap: theme.spacing.xxs,
  },
  groupLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  row: {
    minHeight: THUMB_SIZE + theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.radii.sm,
  },
  thumbFallback: {
    backgroundColor: theme.colors.background,
  },
  rowCopy: {
    flex: 1,
  },
  rowName: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  rowDetail: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
  },
  empty: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    color: theme.colors.text,
  },
  done: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  doneText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
});
