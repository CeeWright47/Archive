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
  styleProfileId: string | null;
  styleProfileName: string | null;
  saved: number;
}

interface FitRow {
  id: string;
  title: string | null;
  occasion: string | null;
  piece_ids: string[] | null;
  why: string | null;
  missing: string | null;
  style_profile_id: string | null;
  style_profile_name: string | null;
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
    styleProfileId: row.style_profile_id,
    styleProfileName: row.style_profile_name,
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

  async get(id: string): Promise<Fit | null> {
    const { data, error } = await supabase
      .from("fits")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToFit(data as FitRow) : null;
  },

  async save(fit: Fit): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase.from("fits").upsert({
      id: fit.id,
      user_id: user.id,
      title: fit.title,
      occasion: fit.occasion,
      piece_ids: fit.pieceIds,
      why: fit.why,
      missing: fit.missing,
      style_profile_id: fit.styleProfileId,
      style_profile_name: fit.styleProfileName,
      saved: fit.saved,
    });
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("fits").delete().eq("id", id);
    if (error) throw error;
  },
};
