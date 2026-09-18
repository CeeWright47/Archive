import { storage } from "./index";
import type { Piece } from "./pieces";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name A–Z" },
  { value: "color", label: "Color" },
  { value: "mostWorn", label: "Most worn" },
  { value: "leastWorn", label: "Least worn" },
] as const;

export type WardrobeSort = (typeof SORT_OPTIONS)[number]["value"];

export const WORN_SORTS: readonly WardrobeSort[] = ["mostWorn", "leastWorn"];
// Wear counts are only meaningful once there's a small outfit history.
export const MIN_OUTFITS_FOR_WORN_SORT = 5;

const SORT_KEY = "archive:wardrobeSort";
const DEFAULT_SORT: WardrobeSort = "newest";

function isSort(value: unknown): value is WardrobeSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export const wardrobeSort = {
  async get(): Promise<WardrobeSort> {
    const stored = await storage.get<string>(SORT_KEY);
    return isSort(stored) ? stored : DEFAULT_SORT;
  },
  async set(sort: WardrobeSort): Promise<void> {
    await storage.set(SORT_KEY, sort);
  },
};

export function wearCountsFrom(
  outfitPieceIds: string[][],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ids of outfitPieceIds) {
    for (const id of new Set(ids)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function sortPieces(
  list: Piece[],
  sort: WardrobeSort,
  wearCounts: Map<string, number>,
): Piece[] {
  const byName = (a: Piece, b: Piece) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const worn = (p: Piece) => wearCounts.get(p.id) ?? 0;
  const sorted = [...list];
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case "name":
      return sorted.sort(byName);
    case "color":
      return sorted.sort(
        (a, b) =>
          a.color.localeCompare(b.color, undefined, { sensitivity: "base" }) ||
          byName(a, b),
      );
    case "mostWorn":
      return sorted.sort(
        (a, b) => worn(b) - worn(a) || b.createdAt - a.createdAt,
      );
    case "leastWorn":
      return sorted.sort(
        (a, b) => worn(a) - worn(b) || b.createdAt - a.createdAt,
      );
    case "newest":
    default:
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
}
