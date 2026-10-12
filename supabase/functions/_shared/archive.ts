import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface PieceRow {
  id: string;
  name: string | null;
  category: string | null;
  color: string | null;
  material: string | null;
  vibe: string | null;
}

// Mirrors src/storage/pieces.ts's CATEGORY_ALIASES/normalizeCategory — the
// pieces table stores the legacy singular, lowercase form ("top", "bottom",
// "outerwear", "shoes", "accessory"), normalized to this canonical casing
// only on the client. Edge functions read the raw column, so they need the
// same normalization to compare categories reliably.
const CATEGORY_ALIASES: Record<string, string> = {
  top: "Tops",
  tops: "Tops",
  bottom: "Bottoms",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  shoe: "Shoes",
  shoes: "Shoes",
  accessory: "Accessories",
  accessories: "Accessories",
};

export function normalizePieceCategory(raw: string | null): string {
  const key = (raw ?? "").trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? "Accessories";
}

export interface StyleContext {
  pieces: PieceRow[];
  styleText: string;
  inspo: { id: string; vibe: string | null; image: string | null }[];
}

export async function getStyleContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<StyleContext> {
  const [piecesResult, preferencesResult, inspoResult] = await Promise.all([
    supabase
      .from("pieces")
      .select("id, name, category, color, material, vibe")
      .eq("user_id", userId),
    supabase
      .from("preferences")
      .select("style_text")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("inspo")
      .select("id, vibe, image")
      .eq("user_id", userId)
      .order("added", { ascending: false }),
  ]);
  if (piecesResult.error) throw piecesResult.error;
  if (preferencesResult.error) throw preferencesResult.error;
  if (inspoResult.error) throw inspoResult.error;
  return {
    pieces: (piecesResult.data ?? []) as PieceRow[],
    styleText: preferencesResult.data?.style_text ?? "",
    inspo: inspoResult.data ?? [],
  };
}

export function closetSummary(pieces: PieceRow[]): string {
  return pieces
    .map(
      (piece) =>
        `[${piece.id}] ${piece.name ?? "Unnamed piece"} — ${piece.category ?? ""}, ${piece.color ?? ""}, ${piece.material ?? ""}. ${piece.vibe ?? ""}`,
    )
    .join("\n");
}

export async function inputsHash(input: {
  styleText: string;
  pieceIds: string[];
  inspoIds: string[];
  outfitIds: string[];
}): Promise<string> {
  const payload = JSON.stringify({
    stated_style: input.styleText,
    closet_piece_ids: [...input.pieceIds].sort(),
    inspo_image_ids: [...input.inspoIds].sort(),
    outfit_ids: [...input.outfitIds].sort(),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function freshProfileId(): string {
  return `prof_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
