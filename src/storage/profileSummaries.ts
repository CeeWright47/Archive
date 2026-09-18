import type {
    Preferences,
    StyleAssessmentRecord,
    UserProfile,
} from "./profile";
import type { StyleAssessment as LegacyAssessment } from "./settings";
import { formatHeight, formatWeight } from "./units";

function join(parts: (string | null | undefined)[]): string | null {
  const kept = parts.filter((p): p is string => Boolean(p));
  return kept.length > 0 ? kept.join(" · ") : null;
}

export function accountSummary(profile: UserProfile): string | undefined {
  return profile.name ?? undefined;
}

export function aboutSummary(
  profile: UserProfile,
  prefs: Preferences,
): string | undefined {
  return (
    join([
      formatHeight(profile.heightCm, prefs.units),
      formatWeight(profile.weightKg, prefs.units),
    ]) ?? undefined
  );
}

export function sizesSummary(profile: UserProfile): string | undefined {
  const { tops, bottoms, shoes } = profile.sizes;
  const waistInseam =
    bottoms.waist !== null && bottoms.inseam !== null
      ? `${bottoms.waist}×${bottoms.inseam}`
      : bottoms.waist !== null
        ? `${bottoms.waist}`
        : null;
  return (
    join([
      tops.letter,
      waistInseam,
      shoes.size !== null ? `${shoes.size}` : null,
    ]) ?? undefined
  );
}

export function styleTextSummary(prefs: Preferences): string | undefined {
  const text = prefs.styleText?.trim();
  if (!text) return undefined;
  if (text.length <= 30) return text;
  const cut = text.slice(0, 30);
  const lastSpace = cut.lastIndexOf(" ");
  const wholeWords = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${wholeWords.trimEnd()}…`;
}

export function fitSummary(prefs: Preferences): string | undefined {
  const { tops, bottoms, cuffing } = prefs.fit;
  return (
    join([
      tops[0] && tops[0] !== "No preference" ? `${tops[0]} tops` : null,
      bottoms[0] && bottoms[0] !== "No preference"
        ? `${bottoms[0]} bottoms`
        : null,
      cuffing && cuffing !== "No preference" ? cuffing : null,
    ]) ?? undefined
  );
}

export function colorsSummary(prefs: Preferences): string | undefined {
  const { worn, avoid } = prefs.colors;
  if (worn.length === 0 && avoid.length === 0) return undefined;
  return `${worn.length} worn · ${avoid.length} avoided`;
}

export function countSummary(items: string[]): string | undefined {
  return items.length === 0 ? undefined : `${items.length} selected`;
}

export function assessmentSummary(
  latest: StyleAssessmentRecord | null,
  legacy: LegacyAssessment | null,
): string {
  if (latest && latest.profiles.length > 0) {
    const [first, ...rest] = latest.profiles;
    return rest.length > 0
      ? `${first.headline} +${rest.length}`
      : first.headline;
  }
  if (legacy?.headline) return legacy.headline;
  return "Not run yet";
}

export function budgetSummary(prefs: Preferences): string | undefined {
  const tiers = Object.values(prefs.budget);
  if (tiers.length === 0) return undefined;
  const sorted = [...tiers].sort((a, b) => a.length - b.length);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  return low === high ? low : `${low}–${high}`;
}

export function unitsSummary(prefs: Preferences): string {
  return prefs.units === "metric" ? "Metric" : "Imperial";
}

export function climateSummary(prefs: Preferences): string | undefined {
  return join([prefs.climate.zone, prefs.climate.city]) ?? undefined;
}
