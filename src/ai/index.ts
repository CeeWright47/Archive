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

// Thrown whenever an Edge Function returns a non-2xx {code, message} body.
// `code` lets specific call sites branch (e.g. into PieceLimitError below);
// `message` is always safe to show the user as-is.
export class EdgeFunctionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "EdgeFunctionError";
    this.code = code;
  }
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

function readableBody(value: unknown): EdgeFunctionError | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.message !== "string") return null;
  return new EdgeFunctionError(
    typeof body.code === "string" ? body.code : "internal_error",
    body.message,
  );
}

async function readableError(error: unknown): Promise<Error> {
  // A thrown FunctionsHttpError's own `.message` is always a fixed generic
  // string ("Edge Function returned a non-2xx status code") — never the
  // real body an Edge Function sent back. That body lives on
  // `error.context`, the raw fetch Response, read below. Duck-type rather
  // than `instanceof Response` — React Native's fetch polyfill doesn't
  // always line up with the global Response constructor this module sees.
  const context = (error as { context?: unknown } | null)?.context as
    | { json?: unknown; text?: unknown }
    | null
    | undefined;
  if (context) {
    try {
      // Read as text first (works for any body, JSON or not) rather than
      // calling .json() directly — a non-2xx can come from the Edge
      // Functions platform itself, or from an out-of-date function deploy
      // that doesn't wrap errors, with a body that isn't our {code,
      // message} shape. .json() throwing on that discarded the real reason
      // entirely, falling back to the SDK's generic message below.
      const text =
        typeof context.text === "function"
          ? await (context.text as () => Promise<string>)()
          : typeof context.json === "function"
            ? JSON.stringify(await (context.json as () => Promise<unknown>)())
            : null;
      if (text) {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          // Not JSON — fall through, the raw text is used below.
        }
        const fromBody = readableBody(parsed);
        if (fromBody) return fromBody;
        // Valid response body, but not our {code, message} shape (or not
        // JSON at all) — still more useful than the SDK's generic message.
        return new EdgeFunctionError("internal_error", text.slice(0, 200));
      }
    } catch {
      // Body wasn't readable at all — fall through to the generic error below.
    }
  }
  return error instanceof Error
    ? error
    : new Error("Something went wrong. Please try again.");
}

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw await readableError(error);
  if (!data) throw new Error(`${name} returned no data.`);
  return data;
}

export const ai = {
  catalogGarment: async (image: string) => {
    try {
      return await invoke<CatalogResult>("catalog-garment", { image });
    } catch (error) {
      if (error instanceof EdgeFunctionError && error.code === "piece_limit_reached") {
        throw new PieceLimitError();
      }
      throw error;
    }
  },
  suggestPairings: (anchorPieceId: string) =>
    invoke<PairingResult>("suggest-pairings", { anchorPieceId }),
  runStyleAssessment: async (input: {
    outfitIds: string[];
    outfitImages: string[];
  }) => {
    try {
      return await invoke<AssessmentResult>("style-assessment", input);
    } catch (error) {
      if (error instanceof EdgeFunctionError && error.code === "plan_required") {
        throw new AssessmentLimitError();
      }
      throw error;
    }
  },
  assessmentInputsHash: (outfitIds: string[]) =>
    invoke<{ inputs_hash: string }>("style-assessment", {
      outfitIds,
      checkOnly: true,
    }),
  generateFit: (occasion: string, anchorPieceId?: string, inspoId?: string) =>
    invoke<GeneratedFitResult>("generate-fit", {
      occasion,
      anchorPieceId,
      inspoId,
    }),
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
