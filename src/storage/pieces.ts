import { supabase } from "@/lib/supabase";

import { fits } from "./fits";
import { normalizeFit, type FitValue } from "./fitVocabulary";
import { images } from "./images";
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
  image: string | null;
  added: number | string;
  fit: string | null;
  rating: number | null;
}

export function generatePieceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// The image for a piece is cached on the filesystem under the same id (see src/storage/images.ts)
// so the UI never has to hold large base64 strings in memory or re-fetch them from Supabase.
export function imageUriFor(piece: Pick<Piece, "id">): string | null {
  return images.read(piece.id);
}

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
      .select("*")
      .order("added", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as PieceRow[];
    await Promise.all(rows.map((row) => cacheImageIfNeeded(row.id, row.image)));
    return rows.map(mapRowToPiece);
  },

  async save(piece: Piece): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const imageBase64 = images.readBase64(piece.id);

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
      ...(imageBase64 !== null ? { image: imageBase64 } : {}),
    });
    if (error) throw error;
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
    const { error } = await supabase.from("pieces").delete().eq("id", id);
    if (error) throw error;
    images.delete(id);
  },
};
