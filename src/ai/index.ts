import { supabase } from "@/lib/supabase";

export interface CatalogResult {
  name: string;
  category: "top" | "bottom" | "shoes" | "outerwear" | "accessory";
  color: string;
  material: string;
  vibe: string;
  seasons: string[];
}

export interface PairingResult {
  sentence: string;
  pair_ids: string[];
}

export interface GeneratedFitResult {
  title: string;
  piece_ids: string[];
  optional_piece_ids: string[];
  why: string;
  missing: string | null;
  style_profile_id: string | null;
  style_profile_name: string;
}

export interface FitStyleAssignment {
  fit_id: string;
  style_profile_id: string | null;
  style_profile_name: string;
}

export interface ScanResult {
  verdict: "cop" | "skip" | "maybe";
  score: number;
  take: string;
  pairs_with: string[];
  item: string;
  price: string | null;
}

export interface GapResultItem {
  item: string;
  why: string;
  price: string;
  priority: number;
  owned: boolean;
}

export interface GapAnalysisResult {
  verdict: string;
  items: GapResultItem[];
  stop_buying: string;
}

export interface AssessmentProfileResult {
  id: string;
  rank: "primary" | "secondary" | "tertiary" | "quaternary";
  headline: string;
  read: string;
  pillars: string[];
  direction: string;
  activity: "active" | "dormant";
  continues_id: string | null;
}

export interface AssessmentResult {
  id: string;
  profiles: AssessmentProfileResult[];
  shared_pieces: string[];
  inputs_hash: string;
  created_at: string;
}

export class PieceLimitError extends Error {
  constructor() {
    super("Your free wardrobe includes up to 50 pieces.");
    this.name = "PieceLimitError";
  }
}

export class AssessmentLimitError extends Error {
  constructor() {
    super("Assessment re-runs are available with Pro.");
    this.name = "AssessmentLimitError";
  }
}

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw error;
  if (!data) throw new Error(`${name} returned no data.`);
  return data;
}

export const ai = {
  catalogGarment: async (image: string) => {
    const result = await invoke<CatalogResult | { limit_reached: true }>(
      "catalog-garment",
      { image },
    );
    if ("limit_reached" in result) throw new PieceLimitError();
    return result;
  },
  suggestPairings: (anchorPieceId: string) =>
    invoke<PairingResult>("suggest-pairings", { anchorPieceId }),
  runStyleAssessment: async (input: {
    outfitIds: string[];
    outfitImages: string[];
  }) => {
    const result = await invoke<AssessmentResult | { limit_reached: true }>(
      "style-assessment",
      input,
    );
    if ("limit_reached" in result) throw new AssessmentLimitError();
    return result;
  },
  assessmentInputsHash: (outfitIds: string[]) =>
    invoke<{ inputs_hash: string }>("style-assessment", {
      outfitIds,
      checkOnly: true,
    }),
  generateFit: (occasion: string, anchorPieceId?: string) =>
    invoke<GeneratedFitResult>("generate-fit", { occasion, anchorPieceId }),
  assignExistingFitStyles: () =>
    invoke<{ assignments: FitStyleAssignment[] }>("generate-fit", {
      classifyExisting: true,
    }),
  scanItem: (image: string) => invoke<ScanResult>("scan-item", { image }),
  analyzeWardrobeGaps: () =>
    invoke<GapAnalysisResult>("analyze-wardrobe-gaps", {}),
  distillInspiration: (image: string) =>
    invoke<{ vibe: string }>("distill-inspiration", { image }),
};
