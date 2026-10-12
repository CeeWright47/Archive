// Single source of truth for color words, same pattern as fitVocabulary.
// The piece detail editor writes only these values going forward.
export const COLORS = [
  "Black",
  "White",
  "Gray",
  "Charcoal",
  "Navy",
  "Blue",
  "Light blue",
  "Green",
  "Olive",
  "Brown",
  "Tan",
  "Beige",
  "Cream",
  "Khaki",
  "Red",
  "Burgundy",
  "Orange",
  "Yellow",
  "Pink",
  "Purple",
  "Multicolor",
] as const;

export type ColorValue = (typeof COLORS)[number];

// Legacy rows may carry free text from earlier AI cataloguing; anything
// outside the vocabulary becomes null so the caller can fall back to it.
export function normalizeColor(raw: string | null | undefined): ColorValue | null {
  if (!raw) return null;
  const match = COLORS.find(
    (color) => color.toLowerCase() === raw.trim().toLowerCase(),
  );
  return match ?? null;
}
