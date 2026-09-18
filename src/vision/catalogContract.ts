import {
    normalizeFit,
    pieceFitsFor,
    type PieceFit,
} from "@/storage/fitVocabulary";
import { PIECE_CATEGORIES, type PieceCategory } from "@/storage/pieces";
import {
    SUBCATEGORIES_BY_CATEGORY,
    normalizeSubcategory,
    type Subcategory,
} from "@/storage/subcategories";

// Output contract for vision cataloguing. The prompt is generated from the shared enums so the
// model is always asked for the exact values the app stores; the parser re-validates anyway.

export interface CatalogResult {
  name: string;
  category: PieceCategory;
  subcategory: Subcategory | null;
  fit: PieceFit | null;
  color: string;
  material: string;
  vibe: string;
  seasons: string[];
}

function list(values: readonly string[]): string {
  return values.map((v) => `"${v}"`).join(", ");
}

export const CATALOG_SYSTEM_PROMPT = [
  "You catalogue a single clothing item from a photo for a wardrobe app.",
  "Respond with one JSON object and nothing else, using exactly these keys:",
  `  "name": short descriptive name, e.g. "Olive cotton polo shirt"`,
  `  "category": one of ${list(PIECE_CATEGORIES)}`,
  `  "subcategory": one of the values for the chosen category, or null if unsure:`,
  ...PIECE_CATEGORIES.map(
    (category) =>
      `      ${category}: ${list(SUBCATEGORIES_BY_CATEGORY[category])}`,
  ),
  `  "fit": how the garment is cut, or null if you cannot tell or the category has no fit:`,
  ...PIECE_CATEGORIES.flatMap((category) => {
    const fits = pieceFitsFor(category);
    return fits ? [`      ${category}: ${list(fits)}`] : [];
  }),
  `  "color": dominant color as a short lowercase word or two`,
  `  "material": primary material, lowercase, or "" if unknown`,
  `  "vibe": one or two lowercase words describing the style`,
  `  "seasons": array drawn from "spring", "summer", "fall", "winter"`,
  "Use the exact strings above for category, subcategory, and fit. Never invent new values.",
].join("\n");

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Accepts the raw model JSON and coerces every enum field through the shared normalizers.
export function parseCatalogResult(raw: unknown): CatalogResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const category = PIECE_CATEGORIES.find(
    (c) => c.toLowerCase() === str(r.category).toLowerCase(),
  );
  if (!category) return null;

  const fitOptions = pieceFitsFor(category);
  const fit = normalizeFit(str(r.fit) || null);

  return {
    name: str(r.name) || "New piece",
    category,
    subcategory: normalizeSubcategory(category, str(r.subcategory) || null),
    fit:
      fitOptions && fit && (fitOptions as readonly string[]).includes(fit)
        ? (fit as PieceFit)
        : null,
    color: str(r.color),
    material: str(r.material),
    vibe: str(r.vibe),
    seasons: Array.isArray(r.seasons)
      ? r.seasons
          .map(str)
          .filter((s) => ["spring", "summer", "fall", "winter"].includes(s))
      : [],
  };
}
