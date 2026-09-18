import { ai } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { pickImage } from "@/media/pickImage";
import { images } from "@/storage/images";
import {
    PIECE_CATEGORIES,
    generatePieceId,
    pieces,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";

export const FREE_PIECE_LIMIT = 50;
export const FREE_PIECE_WARNING_AT = 35;

const DEFAULT_CATEGORY: PieceCategory = PIECE_CATEGORIES[0];
const AI_CATEGORY_MAP: Record<string, PieceCategory> = {
  top: "Tops",
  bottom: "Bottoms",
  shoes: "Shoes",
  outerwear: "Outerwear",
  accessory: "Accessories",
};

export async function catalogPiecesFromLibrary(
  onCreated?: (piece: Piece) => void,
): Promise<Piece[]> {
  const picked = await pickImage.manyFromLibrary();
  const created: Piece[] = [];

  for (const asset of picked) {
    const id = generatePieceId();
    const image = await prepareAiImage(asset.uri);
    const catalog = await ai.catalogGarment(image);
    images.saveFromBase64(id, image);
    const piece: Piece = {
      id,
      name: catalog.name || "New piece",
      category: AI_CATEGORY_MAP[catalog.category] ?? DEFAULT_CATEGORY,
      subcategory: null,
      color: catalog.color,
      material: catalog.material,
      vibe: catalog.vibe,
      seasons: catalog.seasons,
      fit: null,
      createdAt: Date.now(),
    };
    await pieces.save(piece);
    created.push(piece);
    onCreated?.(piece);
  }

  return created;
}
