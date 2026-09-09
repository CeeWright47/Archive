import { supabase } from "@/lib/supabase";

import { images } from "./images";

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
  category: PieceCategory;
  color: string;
  material: string;
  vibe: string;
  seasons: string[];
  fit: string | null;
  createdAt: number;
}

interface PieceRow {
  id: string;
  name: string | null;
  category: string | null;
  color: string | null;
  material: string | null;
  vibe: string | null;
  seasons: string[] | null;
  image: string | null;
  added: number | string;
  fit: string | null;
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
  return {
    id: row.id,
    name: row.name ?? "",
    category: normalizeCategory(row.category),
    color: row.color ?? "",
    material: row.material ?? "",
    vibe: row.vibe ?? "",
    seasons: Array.isArray(row.seasons) ? row.seasons : [],
    fit: row.fit,
    createdAt: Number(row.added),
  };
}

async function cacheImageIfNeeded(id: string, base64: string | null): Promise<void> {
  if (!base64 || images.read(id)) return;
  images.saveFromBase64(id, stripDataUriPrefix(base64));
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
      category: piece.category,
      color: piece.color,
      material: piece.material,
      vibe: piece.vibe,
      seasons: piece.seasons,
      fit: piece.fit,
      added: piece.createdAt,
      ...(imageBase64 !== null ? { image: imageBase64 } : {}),
    });
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("pieces").delete().eq("id", id);
    if (error) throw error;
    images.delete(id);
  },
};
