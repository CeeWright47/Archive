import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

// Images never go through key-value storage — they live here as files, referenced by URI.
// expo-file-system has no web implementation, so every entry point below is a no-op there.
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

export const images = {
  async saveFromUri(id: string, sourceUri: string): Promise<string | null> {
    if (Platform.OS === "web") return null;
    ensureDirectory();
    const destination = fileFor(id);
    await new File(sourceUri).copy(destination, { overwrite: true });
    return destination.uri;
  },

  saveFromBase64(id: string, base64: string): string | null {
    if (Platform.OS === "web") return null;
    ensureDirectory();
    const destination = fileFor(id);
    destination.write(base64, { encoding: "base64" });
    return destination.uri;
  },

  read(id: string): string | null {
    if (Platform.OS === "web") return null;
    const file = fileFor(id);
    return file.exists ? file.uri : null;
  },

  delete(id: string): void {
    if (Platform.OS === "web") return;
    const file = fileFor(id);
    if (file.exists) file.delete();
  },

  list(): string[] {
    if (Platform.OS === "web") return [];
    ensureDirectory();
    return getImagesDirectory()
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => file.name.replace(/\.jpg$/, ""));
  },
};
