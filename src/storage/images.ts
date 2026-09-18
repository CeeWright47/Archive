import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

// Images never go through key-value storage — they live here as files, referenced by URI.
// expo-file-system has no web implementation, so on web we keep data/remote URIs in memory.
const isWeb = Platform.OS === "web";
const webCache = new Map<string, string>();
// Images that already live at a URL (Supabase Storage) are referenced directly on every platform.
const remoteUris = new Map<string, string>();

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

  setRemote(id: string, url: string): void {
    remoteUris.set(id, url);
  },

  read(id: string): string | null {
    const remote = remoteUris.get(id);
    if (remote) return remote;
    if (isWeb) return webCache.get(id) ?? null;
    const file = fileFor(id);
    return file.exists ? file.uri : null;
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
    remoteUris.delete(id);
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
