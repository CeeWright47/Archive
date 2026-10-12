// Single source of truth for material words, same pattern as fitVocabulary.
// The piece detail editor writes only these values going forward.
export const MATERIALS = [
  "Cotton",
  "Cotton twill",
  "Linen",
  "Wool",
  "Denim",
  "Leather",
  "Suede",
  "Polyester",
  "Nylon",
  "Silk",
  "Cashmere",
  "Fleece",
  "Corduroy",
  "Canvas",
  "Knit",
  "Synthetic blend",
  "Other",
] as const;

export type MaterialValue = (typeof MATERIALS)[number];

// Legacy rows may carry free text from earlier AI cataloguing; anything
// outside the vocabulary becomes null so the caller can fall back to it.
export function normalizeMaterial(
  raw: string | null | undefined,
): MaterialValue | null {
  if (!raw) return null;
  const match = MATERIALS.find(
    (material) => material.toLowerCase() === raw.trim().toLowerCase(),
  );
  return match ?? null;
}
