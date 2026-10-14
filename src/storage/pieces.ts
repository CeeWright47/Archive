import type { ImageSource } from "expo-image";

import { supabase } from "@/lib/supabase";

import { fits } from "./fits";
import { normalizeFit, type FitValue } from "./fitVocabulary";
import { images, type ImageVariant } from "./images";
import { photoStore } from "./photoStore";
import { normalizeSubcategory, type Subcategory } from "./subcategories";

export const PIECE_CATEGORIES = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Shoes",
  "Accessories",
] as const;

export type PieceCategory = (typeof PIECE_CATEGORIES)[number];

export interface Piece {
  id: string;
  name: string;
  brand: string | null;
  category: PieceCategory;
  subcategory: Subcategory | null;
  color: string;
  material: string;
  vibe: string;
  seasons: string[];
  fit: FitValue | null;
  rating: number | null;
  createdAt: number;
}

interface PieceRow {
  id: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  material: string | null;
  vibe: string | null;
  seasons: string[] | null;
  image_path: string | null;
  added: number | string;
  fit: string | null;
  rating: number | null;
}

export function generatePieceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// A piece's photo is in Supabase Storage (image_path), registered with the
// image cache under the piece's id. Rows from before that keep a <=480px
// base64 copy in the `image` column until migrateLegacyImages moves it.
export function imageUriFor(piece: Pick<Piece, "id">): string | null {
  return images.read(piece.id);
}

export function imageSourceFor(
  piece: Pick<Piece, "id">,
  variant: ImageVariant,
): ImageSource | null {
  return images.source(piece.id, variant);
}

// Every column except the legacy `image` blob, which list() must not pull.
const PIECE_COLUMNS =
  "id, name, brand, category, subcategory, color, material, vibe, seasons, image_path, added, fit, rating";

// Legacy data uses singular, lowercase category names that don't exactly match PIECE_CATEGORIES.
const CATEGORY_ALIASES: Record<string, PieceCategory> = {
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

function normalizeCategory(raw: string | null): PieceCategory {
  const key = (raw ?? "").trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? PIECE_CATEGORIES[PIECE_CATEGORIES.length - 1];
}

function stripDataUriPrefix(value: string): string {
  const commaIndex = value.indexOf(",");
  return value.startsWith("data:") && commaIndex !== -1
    ? value.slice(commaIndex + 1)
    : value;
}

function mapRowToPiece(row: PieceRow): Piece {
  const category = normalizeCategory(row.category);
  return {
    id: row.id,
    name: row.name ?? "",
    brand: row.brand?.trim() || null,
    category,
    subcategory: normalizeSubcategory(category, row.subcategory),
    color: row.color ?? "",
    material: row.material ?? "",
    vibe: row.vibe ?? "",
    seasons: Array.isArray(row.seasons) ? row.seasons : [],
    fit: normalizeFit(row.fit),
    rating: row.rating ?? null,
    createdAt: Number(row.added),
  };
}

async function cacheImageIfNeeded(
  id: string,
  image: string | null,
): Promise<void> {
  if (!image) return;
  if (/^https?:\/\//i.test(image)) {
    images.setRemote(id, image);
    return;
  }
  if (images.read(id)) return;
  images.saveFromBase64(id, stripDataUriPrefix(image));
}

let legacyMigration: Promise<void> | null = null;

/**
 * One-time move of pre-Storage photos (base64 in `image`) into the bucket.
 * Runs in the background after list(); each piece is done independently, so
 * an interrupted run just resumes on the next launch.
 */
function migrateLegacyImages(ids: string[]): void {
  if (legacyMigration || ids.length === 0) return;
  legacyMigration = (async () => {
    for (const id of ids) {
      try {
        const { data, error } = await supabase
          .from("pieces")
          .select("image")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        const image = data?.image as string | null | undefined;
        if (!image || /^https?:\/\//i.test(image)) continue;
        const path = await photoStore.uploadLegacy("pieces", id, image);
        const { error: updateError } = await supabase
          .from("pieces")
          .update({ image_path: path, image: null })
          .eq("id", id);
        if (updateError) throw updateError;
      } catch (error) {
        console.warn("[pieces] legacy image migration failed", id, error);
      }
    }
  })().finally(() => {
    legacyMigration = null;
  });
}

/** Distinct brands already in the closet, for autocomplete. */
export function brandsFrom(list: Piece[]): string[] {
  const byKey = new Map<string, string>();
  for (const piece of list) {
    if (piece.brand) byKey.set(piece.brand.toLowerCase(), piece.brand);
  }
  return [...byKey.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export const pieces = {
  async list(): Promise<Piece[]> {
    const { data, error } = await supabase
      .from("pieces")
      .select(PIECE_COLUMNS)
      .order("added", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as PieceRow[];

    await photoStore.register(
      rows.flatMap((row) =>
        row.image_path ? [{ localId: row.id, path: row.image_path }] : [],
      ),
    );

    // Legacy rows: show the old base64 copy (fetching only what isn't
    // already cached on this device) and move it to Storage in the background.
    const legacyIds = rows.filter((row) => !row.image_path).map((row) => row.id);
    const uncached = legacyIds.filter((id) => !images.read(id));
    if (uncached.length > 0) {
      const { data: blobs, error: blobError } = await supabase
        .from("pieces")
        .select("id, image")
        .in("id", uncached);
      if (blobError) throw blobError;
      await Promise.all(
        (blobs ?? []).map((row) => cacheImageIfNeeded(row.id, row.image)),
      );
    }
    migrateLegacyImages(legacyIds);

    return rows.map(mapRowToPiece);
  },

  /**
   * Saves a piece's fields. Pass `imagePath` only when the photo changes;
   * omitting it leaves the stored path alone.
   */
  async save(
    piece: Piece,
    options: { imagePath?: string } = {},
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { error } = await supabase.from("pieces").upsert({
      id: piece.id,
      user_id: user.id,
      name: piece.name,
      brand: piece.brand?.trim() || null,
      category: piece.category,
      subcategory: piece.subcategory,
      color: piece.color,
      material: piece.material,
      vibe: piece.vibe,
      seasons: piece.seasons,
      fit: piece.fit,
      rating: piece.rating,
      added: piece.createdAt,
      ...(options.imagePath
        ? { image_path: options.imagePath, image: null }
        : {}),
    });
    if (error) throw error;
  },

  /** Replaces a piece's photo with a newly picked one. */
  async replacePhoto(id: string, sourceUri: string): Promise<void> {
    const { data, error } = await supabase
      .from("pieces")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    const previousPath = data?.image_path as string | null | undefined;
    // A new name each time, so cached copies of the old photo aren't reused.
    const path = await photoStore.upload(
      "pieces",
      `${id}-${Date.now().toString(36)}`,
      sourceUri,
      id,
    );
    const { error: updateError } = await supabase
      .from("pieces")
      .update({ image_path: path, image: null })
      .eq("id", id);
    if (updateError) throw updateError;
    await photoStore.register([{ localId: id, path }]);
    if (previousPath) {
      photoStore.remove([previousPath]).catch((removeError) =>
        console.warn("[pieces] couldn't remove old photo", removeError),
      );
    }
  },

  async remove(id: string): Promise<void> {
    const allFits = await fits.list();
    const affectedFits = allFits.filter((fit) => fit.pieceIds.includes(id));
    await Promise.all(
      affectedFits.map((fit) =>
        fits.save({
          ...fit,
          pieceIds: fit.pieceIds.filter((pieceId) => pieceId !== id),
        }),
      ),
    );
    const { data: row } = await supabase
      .from("pieces")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("pieces").delete().eq("id", id);
    if (error) throw error;
    images.delete(id);
    if (row?.image_path) {
      photoStore.remove([row.image_path]).catch((removeError) =>
        console.warn("[pieces] couldn't remove photo", removeError),
      );
    }
  },
};
