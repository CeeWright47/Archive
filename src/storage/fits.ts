import { supabase } from "@/lib/supabase";

// A "fit" is an AI-suggested outfit combination — distinct from the local, self-photo
// Outfit journal in src/storage/outfits.ts. See src/app/(tabs)/lookbook.tsx.
export interface Fit {
  id: string;
  title: string;
  occasion: string;
  pieceIds: string[];
  why: string;
  missing: string;
  saved: number;
}

interface FitRow {
  id: string;
  title: string | null;
  occasion: string | null;
  piece_ids: string[] | null;
  why: string | null;
  missing: string | null;
  saved: number | string;
}

function mapRowToFit(row: FitRow): Fit {
  return {
    id: row.id,
    title: row.title ?? "",
    occasion: row.occasion ?? "",
    pieceIds: Array.isArray(row.piece_ids) ? row.piece_ids : [],
    why: row.why ?? "",
    missing: row.missing ?? "",
    saved: Number(row.saved),
  };
}

export const fits = {
  async list(): Promise<Fit[]> {
    const { data, error } = await supabase
      .from("fits")
      .select("*")
      .order("saved", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as FitRow[]).map(mapRowToFit);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("fits").delete().eq("id", id);
    if (error) throw error;
  },
};
