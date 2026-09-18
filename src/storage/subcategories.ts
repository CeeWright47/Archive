import type { PieceCategory } from "./pieces";

// Single source of truth for subcategory words, same pattern as fitVocabulary.
// Vision cataloguing and the detail editor must write only these values.
export const SUBCATEGORIES_BY_CATEGORY = {
  Tops: [
    "Tee",
    "Polo",
    "Button-up",
    "Knit",
    "Jersey",
    "Tank",
    "Sweatshirt",
    "Hoodie",
  ],
  Bottoms: ["Jeans", "Chinos", "Cargos", "Shorts", "Slacks", "Joggers"],
  Shoes: ["Sneakers", "Boots", "Loafers", "Boat shoes", "Mocs", "Sandals"],
  Outerwear: ["Jacket", "Coat", "Overshirt", "Vest"],
  Accessories: ["Hat", "Belt", "Watch", "Jewelry", "Bag"],
} as const satisfies Record<PieceCategory, readonly string[]>;

export type Subcategory =
  (typeof SUBCATEGORIES_BY_CATEGORY)[PieceCategory][number];

export function subcategoriesFor(
  category: PieceCategory,
): readonly Subcategory[] {
  return SUBCATEGORIES_BY_CATEGORY[category];
}

// Anything outside the category's list (or a value from another category) becomes null.
export function normalizeSubcategory(
  category: PieceCategory,
  raw: string | null | undefined,
): Subcategory | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  const match = subcategoriesFor(category).find((s) => s.toLowerCase() === key);
  return match ?? null;
}
