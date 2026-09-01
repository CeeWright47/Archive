import { images } from "./images";
import { storage } from "./index";

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
  createdAt: number;
}

const PIECES_KEY = "archive:pieces";

export function generatePieceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// The image for a piece lives on the filesystem under the same id (see src/storage/images.ts).
export function imageUriFor(piece: Pick<Piece, "id">): string | null {
  return images.read(piece.id);
}

export const pieces = {
  async list(): Promise<Piece[]> {
    const stored = await storage.get<Piece[]>(PIECES_KEY);
    return stored ?? [];
  },

  async save(piece: Piece): Promise<void> {
    const all = await pieces.list();
    const index = all.findIndex((existing) => existing.id === piece.id);
    if (index === -1) {
      all.push(piece);
    } else {
      all[index] = piece;
    }
    await storage.set(PIECES_KEY, all);
  },

  async remove(id: string): Promise<void> {
    const all = await pieces.list();
    await storage.set(
      PIECES_KEY,
      all.filter((existing) => existing.id !== id),
    );
    images.delete(id);
  },
};
