import type { ImageSource } from "expo-image";

import { supabase } from "@/lib/supabase";

import { normalizeDateString } from "./dates";
import { images, type ImageVariant } from "./images";
import { storage } from "./index";
import { photoStore } from "./photoStore";

export interface Outfit {
  id: string;
  userId: string | null;
  sourceType: "self-photo";
  imageIds: string[];
  dateWorn: string;
  pieceIds: string[];
  profileTag: string | null;
  occasion: string;
  note: string;
  inInspo: boolean;
  rating: number | null;
  added: number;
}

interface OutfitRow {
  id: string;
  user_id: string;
  image_paths: string[] | null;
  date_worn: string | null;
  occasion: string | null;
  note: string | null;
  piece_ids: string[] | null;
  profile_tag: string | null;
  in_inspo: boolean | null;
  rating: number | null;
  added: number | string;
}

// Outfits used to live only on the device under this key. Anything still
// here hasn't been moved to the `outfits` table yet (see migrateLocalOutfits).
const LOCAL_OUTFITS_KEY = "archive:outfits";

export function generateOutfitId(): string {
  return `o${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateOutfitImageId(): string {
  return `outfit-img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Photo paths are derived from image ids, so a row's image_paths and an
// outfit's imageIds always map back to each other.
function photoPathFor(userId: string, imageId: string): string {
  return `${userId}/outfits/${imageId}.jpg`;
}

function imageIdFromPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.jpg$/, "");
}

function mapRowToOutfit(row: OutfitRow): Outfit {
  return {
    id: row.id,
    userId: row.user_id,
    sourceType: "self-photo",
    imageIds: (row.image_paths ?? []).map(imageIdFromPath),
    dateWorn: row.date_worn ?? "",
    pieceIds: row.piece_ids ?? [],
    profileTag: row.profile_tag,
    occasion: row.occasion ?? "",
    note: row.note ?? "",
    inInspo: row.in_inspo ?? false,
    rating: row.rating ?? null,
    added: Number(row.added),
  };
}

export function imageUriForOutfit(outfit: Outfit): string | null {
  const [coverImageId] = outfit.imageIds;
  return coverImageId ? images.read(coverImageId) : null;
}

export function imageSourceForOutfit(
  outfit: Outfit,
  variant: ImageVariant,
): ImageSource | null {
  const [coverImageId] = outfit.imageIds;
  return coverImageId ? images.source(coverImageId, variant) : null;
}

/** Outfit id → rating, rated outfits only. An assessment input. */
export function outfitRatingsFrom(list: Outfit[]): Record<string, number> {
  const ratings: Record<string, number> = {};
  for (const outfit of list) {
    if (outfit.rating != null) ratings[outfit.id] = outfit.rating;
  }
  return ratings;
}

async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

async function upsertRow(outfit: Outfit, userId: string): Promise<void> {
  const { error } = await supabase.from("outfits").upsert({
    id: outfit.id,
    user_id: userId,
    image_paths: outfit.imageIds.map((imageId) =>
      photoPathFor(userId, imageId),
    ),
    // Older device-only outfits may hold free text here; the column is a date.
    date_worn: normalizeDateString(outfit.dateWorn) || null,
    occasion: outfit.occasion,
    note: outfit.note,
    piece_ids: outfit.pieceIds,
    profile_tag: outfit.profileTag,
    source_type: outfit.sourceType,
    in_inspo: outfit.inInspo,
    rating: outfit.rating,
    added: outfit.added,
  });
  if (error) throw error;
}

async function localOutfits(): Promise<Outfit[]> {
  return (await storage.get<Outfit[]>(LOCAL_OUTFITS_KEY)) ?? [];
}

async function dropLocalOutfit(id: string): Promise<void> {
  const all = await localOutfits();
  if (!all.some((outfit) => outfit.id === id)) return;
  const remaining = all.filter((outfit) => outfit.id !== id);
  if (remaining.length > 0) {
    await storage.set(LOCAL_OUTFITS_KEY, remaining);
  } else {
    await storage.delete(LOCAL_OUTFITS_KEY);
  }
}

let localMigration: Promise<void> | null = null;

/**
 * One-time move of device-only outfits into the `outfits` table, uploading
 * their photos. Each outfit leaves local storage only after its photos and
 * row are saved, so an interrupted run resumes on the next launch. The local
 * photo files stay as a cache.
 */
function migrateLocalOutfits(pending: Outfit[]): void {
  if (localMigration || pending.length === 0) return;
  localMigration = (async () => {
    const userId = await currentUserId();
    for (const outfit of pending) {
      try {
        for (const imageId of outfit.imageIds) {
          const uri = images.read(imageId);
          if (uri) await photoStore.upload("outfits", imageId, uri);
        }
        await upsertRow(outfit, userId);
        await dropLocalOutfit(outfit.id);
      } catch (error) {
        console.warn("[outfits] couldn't move outfit", outfit.id, error);
      }
    }
  })()
    .catch((error) => console.warn("[outfits] migration failed", error))
    .finally(() => {
      localMigration = null;
    });
}

export const outfits = {
  async list(): Promise<Outfit[]> {
    const { data, error } = await supabase
      .from("outfits")
      .select("*")
      .order("added", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as OutfitRow[];

    await photoStore.register(
      rows.flatMap((row) =>
        (row.image_paths ?? []).map((path) => ({
          localId: imageIdFromPath(path),
          path,
        })),
      ),
    );

    // Not-yet-moved local outfits still show, from their local photos.
    const remote = rows.map(mapRowToOutfit);
    const remoteIds = new Set(remote.map((outfit) => outfit.id));
    const pending = (await localOutfits()).filter(
      (outfit) => !remoteIds.has(outfit.id),
    );
    migrateLocalOutfits(pending);

    return [...remote, ...pending];
  },

  /**
   * Saves an outfit's fields. New photos must already be uploaded with
   * photoStore.upload("outfits", imageId, …).
   */
  async save(outfit: Outfit): Promise<void> {
    const userId = await currentUserId();
    // Edited before the background move got to it: upload its photos now,
    // since dropping it from local storage takes it out of the migration.
    const stillLocal = (await localOutfits()).some(
      (local) => local.id === outfit.id,
    );
    if (stillLocal) {
      for (const imageId of outfit.imageIds) {
        const uri = images.read(imageId);
        if (uri) await photoStore.upload("outfits", imageId, uri);
      }
    }
    await upsertRow(outfit, userId);
    await dropLocalOutfit(outfit.id);
  },

  async remove(id: string): Promise<void> {
    const userId = await currentUserId();
    const { data } = await supabase
      .from("outfits")
      .select("image_paths")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("outfits").delete().eq("id", id);
    if (error) throw error;

    const local = (await localOutfits()).find((outfit) => outfit.id === id);
    await dropLocalOutfit(id);

    const paths: string[] = data?.image_paths ?? [];
    const imageIds = new Set([
      ...paths.map(imageIdFromPath),
      ...(local?.imageIds ?? []),
    ]);
    imageIds.forEach((imageId) => images.delete(imageId));
    photoStore
      .remove([...imageIds].map((imageId) => photoPathFor(userId, imageId)))
      .catch((removeError) =>
        console.warn("[outfits] couldn't remove photos", removeError),
      );
  },
};
