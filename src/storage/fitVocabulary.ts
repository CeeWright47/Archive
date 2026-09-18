// Single source of truth for fit words. Pieces, preferences, and chip groups all read from here
// so the values written to `pieces.fit` and `preferences.fit_preferences` always match.

export const TOP_FITS = [
  "Muscle",
  "Slim",
  "Regular",
  "Relaxed",
  "Oversized",
  "No preference",
] as const;

export const BOTTOM_FITS = [
  "Skinny",
  "Slim",
  "Regular",
  "Relaxed",
  "Loose",
  "No preference",
] as const;

export const OUTERWEAR_FITS = TOP_FITS;

export const CUFFING_OPTIONS = ["Cuffed", "Uncuffed", "No preference"] as const;

export const LENGTH_OPTIONS = [
  "No break",
  "Slight break",
  "Full break",
  "No preference",
] as const;

export type TopFit = (typeof TOP_FITS)[number];
export type BottomFit = (typeof BOTTOM_FITS)[number];
export type OuterwearFit = (typeof OUTERWEAR_FITS)[number];
export type Cuffing = (typeof CUFFING_OPTIONS)[number];
export type Length = (typeof LENGTH_OPTIONS)[number];

export type FitValue = TopFit | BottomFit;

export const FIT_OPTIONS_BY_CATEGORY = {
  Tops: TOP_FITS,
  Bottoms: BOTTOM_FITS,
  Outerwear: OUTERWEAR_FITS,
} as const;

export type FitCategory = keyof typeof FIT_OPTIONS_BY_CATEGORY;

// A piece has a fit; "No preference" only makes sense for user preferences.
export type PieceFit = Exclude<FitValue, "No preference">;

const withoutNoPreference = <T extends string>(options: readonly T[]) =>
  options.filter(
    (o): o is Exclude<T, "No preference"> => o !== "No preference",
  );

export const PIECE_FITS_BY_CATEGORY: Partial<
  Record<string, readonly PieceFit[]>
> = {
  Tops: withoutNoPreference(TOP_FITS),
  Outerwear: withoutNoPreference(OUTERWEAR_FITS),
  Bottoms: withoutNoPreference(BOTTOM_FITS),
};

// Null for categories where fit doesn't apply (Shoes, Accessories).
export function pieceFitsFor(category: string): readonly PieceFit[] | null {
  return PIECE_FITS_BY_CATEGORY[category] ?? null;
}

export const ALL_PIECE_FITS: readonly PieceFit[] = Array.from(
  new Set<PieceFit>([
    ...withoutNoPreference(TOP_FITS),
    ...withoutNoPreference(BOTTOM_FITS),
  ]),
);

const ALL_FITS: readonly string[] = Array.from(
  new Set<string>([...TOP_FITS, ...BOTTOM_FITS]),
);

export function isFitValue(value: unknown): value is FitValue {
  return typeof value === "string" && ALL_FITS.includes(value);
}

// Legacy rows may carry different casing; anything outside the vocabulary becomes null.
export function normalizeFit(raw: string | null | undefined): FitValue | null {
  if (!raw) return null;
  const match = ALL_FITS.find(
    (fit) => fit.toLowerCase() === raw.trim().toLowerCase(),
  );
  return (match as FitValue | undefined) ?? null;
}
