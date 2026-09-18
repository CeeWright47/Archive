import type {
    Preferences,
    StyleAssessmentRecord,
    UserProfile,
} from "./profile";
import type { StyleAssessment as LegacyAssessment } from "./settings";
import { formatHeight, formatWeight } from "./units";

const NOT_SET = "Not set";

function join(parts: (string | null | undefined)[]): string | null {
  const kept = parts.filter((p): p is string => Boolean(p));
  return kept.length > 0 ? kept.join(" · ") : null;
}

export function accountSummary(profile: UserProfile): string {
  return profile.name ?? NOT_SET;
}

export function aboutSummary(profile: UserProfile, prefs: Preferences): string {
  return (
    join([
      formatHeight(profile.heightCm, prefs.units),
      formatWeight(profile.weightKg, prefs.units),
    ]) ?? NOT_SET
  );
}

export function sizesSummary(profile: UserProfile): string {
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
    ]) ?? NOT_SET
  );
}

export function styleTextSummary(prefs: Preferences): string {
  const text = prefs.styleText?.trim();
  if (!text) return NOT_SET;
  return text.length > 30 ? `${text.slice(0, 30).trimEnd()}…` : text;
}

export function fitSummary(prefs: Preferences): string {
  const { tops, bottoms, cuffing } = prefs.fit;
  return (
    join([
      tops[0] && tops[0] !== "No preference" ? `${tops[0]} tops` : null,
      bottoms[0] && bottoms[0] !== "No preference"
        ? `${bottoms[0]} bottoms`
        : null,
      cuffing && cuffing !== "No preference" ? cuffing : null,
    ]) ?? NOT_SET
  );
}

export function colorsSummary(prefs: Preferences): string {
  const { worn, avoid } = prefs.colors;
  if (worn.length === 0 && avoid.length === 0) return NOT_SET;
  return `${worn.length} worn · ${avoid.length} avoided`;
}

export function countSummary(items: string[]): string {
  return items.length === 0 ? NOT_SET : `${items.length} selected`;
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

export function budgetSummary(prefs: Preferences): string {
  const tiers = Object.values(prefs.budget);
  if (tiers.length === 0) return NOT_SET;
  const sorted = [...tiers].sort((a, b) => a.length - b.length);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  return low === high ? low : `${low}–${high}`;
}

export function unitsSummary(prefs: Preferences): string {
  return prefs.units === "metric" ? "Metric" : "Imperial";
}

export function climateSummary(prefs: Preferences): string {
  return join([prefs.climate.zone, prefs.climate.city]) ?? NOT_SET;
}
