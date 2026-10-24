import { ai } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { pickImage, type PickedImage } from "@/media/pickImage";
import {
    PIECE_CATEGORIES,
    generatePieceId,
    pieces,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";
import { photoStore } from "@/storage/photoStore";

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

/**
 * Catalogs pieces from one camera shot or several library photos. Returns
 * an empty list if the person cancels the picker.
 */
export async function catalogPieces(
  source: "camera" | "library",
  onCreated?: (piece: Piece) => void,
): Promise<Piece[]> {
  let picked: PickedImage[];
  if (source === "camera") {
    const shot = await pickImage.fromCamera();
    picked = shot ? [shot] : [];
  } else {
    picked = await pickImage.manyFromLibrary();
  }
  const created: Piece[] = [];

  for (const asset of picked) {
    const id = generatePieceId();
    const image = await prepareAiImage(asset.uri);
    const catalog = await ai.catalogGarment(image);
    const imagePath = await photoStore.upload("pieces", id, asset.uri);
    const piece: Piece = {
      id,
      name: catalog.name || "New piece",
      brand: catalog.brand?.trim() || null,
      category: AI_CATEGORY_MAP[catalog.category] ?? DEFAULT_CATEGORY,
      subcategory: null,
      color: catalog.color,
      material: catalog.material,
      vibe: catalog.vibe,
      seasons: catalog.seasons,
      fit: null,
      rating: null,
      createdAt: Date.now(),
    };
    await pieces.save(piece, { imagePath });
    await photoStore.register([{ localId: id, path: imagePath }]);
    created.push(piece);
    onCreated?.(piece);
  }

  return created;
}
