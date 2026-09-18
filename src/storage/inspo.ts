import { supabase } from "@/lib/supabase";

import { images } from "./images";

// An inspiration-board image with a short vibe description.
export interface InspoImage {
  id: string;
  vibe: string;
  added: number;
}

interface InspoRow {
  id: string;
  vibe: string | null;
  image: string | null;
  added: number | string;
}

export function generateInspoId(): string {
  return `i${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapRowToInspo(row: InspoRow): InspoImage {
  return {
    id: row.id,
    vibe: row.vibe ?? "",
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

// Image for an inspo entry is cached on the filesystem under its id, same as pieces.
export function imageUriForInspo(inspo: Pick<InspoImage, "id">): string | null {
  return images.read(inspo.id);
}

export const inspo = {
  async list(): Promise<InspoImage[]> {
    const { data, error } = await supabase
      .from("inspo")
      .select("*")
      .order("added", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as InspoRow[];
    await Promise.all(rows.map((row) => cacheImageIfNeeded(row.id, row.image)));
    return rows.map(mapRowToInspo);
  },

  async add(
    sourceUri: string,
    vibe = "",
    imageBase64?: string,
  ): Promise<InspoImage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const id = generateInspoId();
    const added = Date.now();
    if (imageBase64) {
      images.saveFromBase64(id, imageBase64);
    } else {
      await images.saveFromUri(id, sourceUri);
    }
    const storedImage = imageBase64 ?? images.readBase64(id);

    const { error } = await supabase.from("inspo").insert({
      id,
      user_id: user.id,
      vibe,
      added,
      ...(storedImage !== null ? { image: storedImage } : {}),
    });
    if (error) throw error;

    return { id, vibe, added };
  },
};
