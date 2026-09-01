import { storage } from "@/storage";
import { images } from "@/storage/images";

import type { WebExport, WebExportOutfit } from "./types";

const KEYS = {
  pieces: "archive:pieces",
  outfits: "archive:outfits",
  preferences: "archive:preferences",
  user: "archive:user",
  assessment: "archive:assessment",
} as const;

function stripDataUriPrefix(value: string): string {
  const commaIndex = value.indexOf(",");
  return value.startsWith("data:") && commaIndex !== -1
    ? value.slice(commaIndex + 1)
    : value;
}

// Pulls base64 outfit images out of the JSON and writes them to the filesystem,
// keeping only file paths in what gets stored under the outfits key.
function relocateOutfitImages(outfit: WebExportOutfit): Omit<
  WebExportOutfit,
  "images"
> & {
  imagePaths: string[];
} {
  const { images: base64Images, ...rest } = outfit;
  const imagePaths = (base64Images ?? [])
    .map((base64, index) =>
      images.saveFromBase64(
        `${outfit.id}-${index}`,
        stripDataUriPrefix(base64),
      ),
    )
    .filter((path): path is string => path !== null);
  return { ...rest, imagePaths };
}

export async function importWebExport(data: WebExport): Promise<void> {
  const outfitsWithFilePaths = data.outfits.map(relocateOutfitImages);

  await storage.set(KEYS.pieces, data.pieces);
  await storage.set(KEYS.outfits, outfitsWithFilePaths);
  await storage.set(KEYS.preferences, data.preferences);
  await storage.set(KEYS.user, data.user);
  await storage.set(KEYS.assessment, data.assessment);
}
