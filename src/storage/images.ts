import { Directory, File, Paths } from "expo-file-system";
import type { ImageSource } from "expo-image";
import { Platform } from "react-native";

// Images never go through key-value storage — they live here as files, referenced by URI.
// expo-file-system has no web implementation, so on web we keep data/remote URIs in memory.
const isWeb = Platform.OS === "web";
const webCache = new Map<string, string>();
// Images that live in Supabase Storage, by local id. URLs are signed and change
// between launches, so display caches by `cacheKey` (the storage path) instead.
interface RemoteImage {
  full: string;
  thumb: string;
  cacheKey: string;
}
const remoteImages = new Map<string, RemoteImage>();

export type ImageVariant = "thumb" | "full";

let imagesDirectory: Directory | null = null;

function getImagesDirectory(): Directory {
  if (!imagesDirectory) {
    imagesDirectory = new Directory(Paths.document, "archive-images");
  }
  return imagesDirectory;
}

function ensureDirectory(): void {
  const directory = getImagesDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
}

function fileFor(id: string): File {
  return new File(getImagesDirectory(), `${id}.jpg`);
}

function toDataUri(base64: string): string {
  return base64.startsWith("data:")
    ? base64
    : `data:image/jpeg;base64,${base64}`;
}

function readLocal(id: string): string | null {
  if (isWeb) return webCache.get(id) ?? null;
  const file = fileFor(id);
  return file.exists ? file.uri : null;
}

export const images = {
  async saveFromUri(id: string, sourceUri: string): Promise<string | null> {
    if (isWeb) {
      webCache.set(id, sourceUri);
      return sourceUri;
    }
    ensureDirectory();
    const destination = fileFor(id);
    await new File(sourceUri).copy(destination, { overwrite: true });
    return destination.uri;
  },

  saveFromBase64(id: string, base64: string): string | null {
    if (isWeb) {
      const uri = toDataUri(base64);
      webCache.set(id, uri);
      return uri;
    }
    ensureDirectory();
    const destination = fileFor(id);
    destination.write(base64, { encoding: "base64" });
    return destination.uri;
  },

  setRemote(id: string, remote: RemoteImage | string): void {
    remoteImages.set(
      id,
      typeof remote === "string"
        ? { full: remote, thumb: remote, cacheKey: remote }
        : remote,
    );
  },

  /** A URI for the full image: the local copy if there is one, else remote. */
  read(id: string): string | null {
    return readLocal(id) ?? remoteImages.get(id)?.full ?? null;
  },

  /**
   * What an <Image> should load. Grids pass "thumb" for the small remote
   * rendition; detail views pass "full". Falls back to whatever exists.
   */
  source(id: string, variant: ImageVariant): ImageSource | null {
    const remote = remoteImages.get(id);
    const local = readLocal(id);
    if (variant === "thumb" && remote) {
      return { uri: remote.thumb, cacheKey: `${remote.cacheKey}#thumb` };
    }
    if (local) return { uri: local };
    if (remote) return { uri: remote.full, cacheKey: remote.cacheKey };
    return null;
  },

  /**
   * A local file URI for the full image, downloading it first if it only
   * exists remotely. For image processing that needs a file.
   */
  async localUri(id: string): Promise<string | null> {
    const local = readLocal(id);
    if (local) return local;
    const remote = remoteImages.get(id);
    if (!remote) return null;
    if (isWeb) return remote.full;
    ensureDirectory();
    const file = await File.downloadFileAsync(remote.full, fileFor(id));
    return file.uri;
  },

  readBase64(id: string): string | null {
    if (isWeb) {
      const uri = webCache.get(id);
      if (!uri || !uri.startsWith("data:")) return null;
      return uri.slice(uri.indexOf(",") + 1);
    }
    const file = fileFor(id);
    return file.exists ? file.base64Sync() : null;
  },

  delete(id: string): void {
    remoteImages.delete(id);
    if (isWeb) {
      webCache.delete(id);
      return;
    }
    const file = fileFor(id);
    if (file.exists) file.delete();
  },

  list(): string[] {
    if (isWeb) return [...webCache.keys()];
    ensureDirectory();
    return getImagesDirectory()
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => file.name.replace(/\.jpg$/, ""));
  },
};
