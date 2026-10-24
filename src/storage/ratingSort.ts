export type RatingDirection = "highest" | "lowest";

/**
 * Comparator for rating sorts. Unrated items (null) go last in both
 * directions, so "Lowest rated" surfaces real low ratings rather than
 * everything nobody has rated yet. Returns 0 on a tie so callers can chain a
 * tiebreaker with `||`.
 */
export function compareRatings(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: RatingDirection,
): number {
  const aRated = a != null;
  const bRated = b != null;
  if (!aRated || !bRated) return Number(!aRated) - Number(!bRated);
  return direction === "highest" ? b - a : a - b;
}
