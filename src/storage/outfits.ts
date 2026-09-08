import { images } from "./images";
import { storage } from "./index";

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
  added: number;
}

const OUTFITS_KEY = "archive:outfits";

export function generateOutfitId(): string {
  return `o${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateOutfitImageId(): string {
  return `outfit-img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function imageUriForOutfit(outfit: Outfit): string | null {
  const [coverImageId] = outfit.imageIds;
  return coverImageId ? images.read(coverImageId) : null;
}

export const outfits = {
  async list(): Promise<Outfit[]> {
    const stored = await storage.get<Outfit[]>(OUTFITS_KEY);
    return stored ?? [];
  },

  async save(outfit: Outfit): Promise<void> {
    const all = await outfits.list();
    const index = all.findIndex((existing) => existing.id === outfit.id);
    if (index === -1) {
      all.push(outfit);
    } else {
      all[index] = outfit;
    }
    await storage.set(OUTFITS_KEY, all);
  },

  async remove(id: string): Promise<void> {
    const all = await outfits.list();
    const removed = all.find((outfit) => outfit.id === id);
    await storage.set(
      OUTFITS_KEY,
      all.filter((outfit) => outfit.id !== id),
    );
    removed?.imageIds.forEach((imageId) => images.delete(imageId));
  },
};
