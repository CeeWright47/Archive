import { storage } from "./index";
import { compareRatings } from "./ratingSort";

export const LOOKBOOK_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "ratingHigh", label: "Highest rated" },
  { value: "ratingLow", label: "Lowest rated" },
] as const;

export type LookbookSort = (typeof LOOKBOOK_SORT_OPTIONS)[number]["value"];

/** Each Lookbook grid remembers its own sort. */
export type LookbookGrid = "inspiration" | "myStyle";

const SORT_KEYS: Record<LookbookGrid, string> = {
  inspiration: "archive:lookbookSort:inspiration",
  myStyle: "archive:lookbookSort:myStyle",
};
const DEFAULT_SORT: LookbookSort = "newest";

function isSort(value: unknown): value is LookbookSort {
  return LOOKBOOK_SORT_OPTIONS.some((option) => option.value === value);
}

export const lookbookSort = {
  async get(grid: LookbookGrid): Promise<LookbookSort> {
    const stored = await storage.get<string>(SORT_KEYS[grid]);
    return isSort(stored) ? stored : DEFAULT_SORT;
  },
  async set(grid: LookbookGrid, sort: LookbookSort): Promise<void> {
    await storage.set(SORT_KEYS[grid], sort);
  },
};

interface Sortable {
  added: number;
  rating: number | null;
}

export function sortLookbook<T extends Sortable>(
  list: readonly T[],
  sort: LookbookSort,
): T[] {
  const newestFirst = (a: T, b: T) => b.added - a.added;
  const sorted = [...list];
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.added - b.added);
    case "ratingHigh":
      return sorted.sort(
        (a, b) => compareRatings(a.rating, b.rating, "highest") || newestFirst(a, b),
      );
    case "ratingLow":
      return sorted.sort(
        (a, b) => compareRatings(a.rating, b.rating, "lowest") || newestFirst(a, b),
      );
    case "newest":
    default:
      return sorted.sort(newestFirst);
  }
}
