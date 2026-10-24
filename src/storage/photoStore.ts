import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

import { images } from "./images";

// Photos live in the private `archive-images` bucket under the owner's
// folder (RLS checks the first path segment against auth.uid()):
//
//   {userId}/{kind}/{name}.jpg        displayed original, longest edge ≤2048
//   {userId}/{kind}/{name}.thumb.jpg  grid rendition, longest edge ≤600
//
// The 480px copy sent to the model is built at request time by
// prepareAiImage and only stored where a server function has to read it
// (the inspo `image` column).

const BUCKET = "archive-images";
const ORIGINAL_EDGE = 2048;
const ORIGINAL_QUALITY = 0.85;
const THUMB_EDGE = 600;
const THUMB_QUALITY = 0.8;
// Long enough to outlive a session; expo-image caches by path (see
// images.source), so a new URL on the next launch doesn't re-download.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const SIGN_BATCH_SIZE = 100;

export type PhotoKind = "pieces" | "inspo" | "outfits";

export function thumbPathFor(path: string): string {
  return path.replace(/\.jpg$/, ".thumb.jpg");
}

async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

async function renderJpeg(
  uri: string,
  maxEdge: number,
  quality: number,
): Promise<string> {
  const source = await ImageManipulator.manipulate(uri).renderAsync();
  const longestEdge = Math.max(source.width, source.height);
  const context = ImageManipulator.manipulate(source);
  if (longestEdge > maxEdge) {
    const scale = maxEdge / longestEdge;
    context.resize({
      width: Math.round(source.width * scale),
      height: Math.round(source.height * scale),
    });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: quality,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

async function bytesOf(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

async function put(path: string, body: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
}

export const photoStore = {
  /**
   * Resizes a picked photo into the stored original and grid thumbnail,
   * uploads both, and caches the original locally under `localId` so it
   * shows immediately. Returns the original's storage path.
   */
  async upload(
    kind: PhotoKind,
    name: string,
    sourceUri: string,
    localId: string = name,
  ): Promise<string> {
    const userId = await currentUserId();
    const path = `${userId}/${kind}/${name}.jpg`;
    const [originalUri, thumbUri] = await Promise.all([
      renderJpeg(sourceUri, ORIGINAL_EDGE, ORIGINAL_QUALITY),
      renderJpeg(sourceUri, THUMB_EDGE, THUMB_QUALITY),
    ]);
    const [original, thumb] = await Promise.all([
      bytesOf(originalUri),
      bytesOf(thumbUri),
    ]);
    await Promise.all([put(path, original), put(thumbPathFor(path), thumb)]);
    await images.saveFromUri(localId, originalUri);
    return path;
  },

  /**
   * Moves a legacy base64 image (already ≤480px) into the bucket as-is.
   * It's too small to need a separate thumbnail, so both paths get the
   * same bytes.
   */
  async uploadLegacy(
    kind: PhotoKind,
    name: string,
    base64: string,
  ): Promise<string> {
    const userId = await currentUserId();
    const path = `${userId}/${kind}/${name}.jpg`;
    const raw = base64.slice(base64.indexOf(",") + 1);
    const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
    await Promise.all([
      put(path, bytes.buffer),
      put(thumbPathFor(path), bytes.buffer),
    ]);
    return path;
  },

  /**
   * Signs originals and thumbnails for the given paths and registers them
   * with the image cache under each owner's local id. Paths that fail to
   * sign (e.g. not uploaded yet) are skipped, leaving any local copy in use.
   */
  async register(entries: { localId: string; path: string }[]): Promise<void> {
    if (entries.length === 0) return;
    const allPaths = entries.flatMap(({ path }) => [path, thumbPathFor(path)]);
    const urls = new Map<string, string>();
    for (let i = 0; i < allPaths.length; i += SIGN_BATCH_SIZE) {
      const batch = allPaths.slice(i, i + SIGN_BATCH_SIZE);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(batch, SIGNED_URL_TTL_SECONDS);
      if (error) {
        // Don't fail the whole list over photos; local copies still show.
        console.warn("[photoStore] couldn't sign photo URLs", error);
        continue;
      }
      for (const item of data) {
        if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
      }
    }
    for (const { localId, path } of entries) {
      const full = urls.get(path);
      if (!full) continue;
      images.setRemote(localId, {
        full,
        thumb: urls.get(thumbPathFor(path)) ?? full,
        cacheKey: path,
      });
    }
  },

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(paths.flatMap((path) => [path, thumbPathFor(path)]));
    if (error) throw error;
  },
};
