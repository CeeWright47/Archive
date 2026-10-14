import type { ImageSource } from "expo-image";

import { supabase } from "@/lib/supabase";

import { images, type ImageVariant } from "./images";
import { photoStore } from "./photoStore";

// An inspiration-board image with a short vibe description.
export interface InspoImage {
  id: string;
  vibe: string;
  rating: number | null;
  added: number;
}

interface InspoRow {
  id: string;
  vibe: string | null;
  image_path: string | null;
  added: number | string;
  rating: number | null;
}

// The `image` column (a 480px base64 copy) is still written because server
// functions send it to the model, but list() never selects it: the app
// displays the Storage original at image_path.
const INSPO_COLUMNS = "id, vibe, image_path, added, rating";

export function generateInspoId(): string {
  return `i${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapRowToInspo(row: InspoRow): InspoImage {
  return {
    id: row.id,
    vibe: row.vibe ?? "",
    rating: row.rating ?? null,
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

export function imageUriForInspo(inspo: Pick<InspoImage, "id">): string | null {
  return images.read(inspo.id);
}

export function imageSourceForInspo(
  inspo: Pick<InspoImage, "id">,
  variant: ImageVariant,
): ImageSource | null {
  return images.source(inspo.id, variant);
}

let legacyMigration: Promise<void> | null = null;

/**
 * One-time copy of pre-Storage inspo images into the bucket, so every entry
 * displays from Storage. The `image` column is kept for the server functions.
 */
function migrateLegacyImages(ids: string[]): void {
  if (legacyMigration || ids.length === 0) return;
  legacyMigration = (async () => {
    for (const id of ids) {
      try {
        const { data, error } = await supabase
          .from("inspo")
          .select("image")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        const image = data?.image as string | null | undefined;
        if (!image) continue;
        const path = await photoStore.uploadLegacy("inspo", id, image);
        const { error: updateError } = await supabase
          .from("inspo")
          .update({ image_path: path })
          .eq("id", id);
        if (updateError) throw updateError;
      } catch (error) {
        console.warn("[inspo] legacy image migration failed", id, error);
      }
    }
  })().finally(() => {
    legacyMigration = null;
  });
}

export const inspo = {
  async list(): Promise<InspoImage[]> {
    const { data, error } = await supabase
      .from("inspo")
      .select(INSPO_COLUMNS)
      .order("added", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as InspoRow[];

    await photoStore.register(
      rows.flatMap((row) =>
        row.image_path ? [{ localId: row.id, path: row.image_path }] : [],
      ),
    );

    const legacyIds = rows.filter((row) => !row.image_path).map((row) => row.id);
    const uncached = legacyIds.filter((id) => !images.read(id));
    if (uncached.length > 0) {
      const { data: blobs, error: blobError } = await supabase
        .from("inspo")
        .select("id, image")
        .in("id", uncached);
      if (blobError) throw blobError;
      await Promise.all(
        (blobs ?? []).map((row) => cacheImageIfNeeded(row.id, row.image)),
      );
    }
    migrateLegacyImages(legacyIds);

    return rows.map(mapRowToInspo);
  },

  /**
   * Adds an inspo entry: the picked photo goes to Storage as the displayed
   * original, and `aiImageBase64` (from prepareAiImage) is stored for the
   * server functions that read inspo.
   */
  async add(
    sourceUri: string,
    vibe: string,
    aiImageBase64: string,
  ): Promise<InspoImage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const id = generateInspoId();
    const added = Date.now();
    const imagePath = await photoStore.upload("inspo", id, sourceUri);

    const { error } = await supabase.from("inspo").insert({
      id,
      user_id: user.id,
      vibe,
      added,
      image: aiImageBase64,
      image_path: imagePath,
    });
    if (error) throw error;
    await photoStore.register([{ localId: id, path: imagePath }]);

    return { id, vibe, rating: null, added };
  },

  async setRating(id: string, rating: number | null): Promise<void> {
    const { error } = await supabase
      .from("inspo")
      .update({ rating })
      .eq("id", id);
    if (error) throw error;
  },
};
