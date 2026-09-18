import { supabase } from "@/lib/supabase";

import { images } from "./images";

// A wishlist item — something the user wants to buy, scored against their existing wardrobe.
export interface Want {
  id: string;
  item: string;
  reason: string;
  price: string;
  score: number;
  owned: boolean;
  added: number;
}

interface WantRow {
  id: string;
  item: string | null;
  reason: string | null;
  price: string | null;
  score: number | null;
  image: string | null;
  owned: boolean;
  added: number | string;
}

function mapRowToWant(row: WantRow): Want {
  return {
    id: row.id,
    item: row.item ?? "",
    reason: row.reason ?? "",
    price: row.price ?? "",
    score: row.score ?? 0,
    owned: row.owned,
    added: Number(row.added),
  };
}

function stripDataUriPrefix(value: string): string {
  const commaIndex = value.indexOf(",");
  return value.startsWith("data:") && commaIndex !== -1
    ? value.slice(commaIndex + 1)
    : value;
}

async function cacheImageIfNeeded(
  id: string,
  base64: string | null,
): Promise<void> {
  if (!base64 || images.read(id)) return;
  images.saveFromBase64(id, stripDataUriPrefix(base64));
}

// Image for a want is cached on the filesystem under its id, same as pieces.
export function imageUriForWant(want: Pick<Want, "id">): string | null {
  return images.read(want.id);
}

export const wants = {
  async list(): Promise<Want[]> {
    const { data, error } = await supabase
      .from("wants")
      .select("*")
      .order("added", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as WantRow[];
    await Promise.all(rows.map((row) => cacheImageIfNeeded(row.id, row.image)));
    return rows.map(mapRowToWant);
  },

  async add(want: Want, imageBase64: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase.from("wants").insert({
      id: want.id,
      user_id: user.id,
      item: want.item,
      reason: want.reason,
      price: want.price,
      score: want.score,
      image: imageBase64,
      owned: want.owned,
      added: want.added,
    });
    if (error) throw error;
    images.saveFromBase64(want.id, imageBase64);
  },

  async setOwned(id: string, owned: boolean): Promise<void> {
    const { error } = await supabase
      .from("wants")
      .update({ owned })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("wants").delete().eq("id", id);
    if (error) throw error;
    images.delete(id);
  },
};
