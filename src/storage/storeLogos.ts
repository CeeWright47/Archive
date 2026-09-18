import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

// Logos come from a public logo API keyed by domain; nothing is bundled.
// Swap the endpoint here if moving from Clearbit to Brandfetch.
export function logoUrlFor(domain: string): string {
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=80`;
}

const isWeb = Platform.OS === "web";
const inflight = new Map<string, Promise<string | null>>();
const resolved = new Map<string, string | null>();

let logosDirectory: Directory | null = null;

function directory(): Directory {
  if (!logosDirectory) {
    logosDirectory = new Directory(Paths.cache, "store-logos");
  }
  if (!logosDirectory.exists) logosDirectory.create({ intermediates: true });
  return logosDirectory;
}

function fileFor(domain: string): File {
  return new File(directory(), `${domain.replace(/[^a-z0-9.-]/gi, "_")}.png`);
}

async function fetchAndCache(domain: string): Promise<string | null> {
  // No filesystem on web; the browser caches the image and <Image onError> handles misses.
  if (isWeb) return logoUrlFor(domain);
  const target = fileFor(domain);
  if (target.exists) return target.uri;
  try {
    const file = await File.downloadFileAsync(logoUrlFor(domain), target);
    return file.uri;
  } catch {
    if (target.exists) target.delete();
    return null;
  }
}

export const storeLogos = {
  /** Resolves to a local (or web) URI, or null when the logo isn't available. */
  get(domain: string): Promise<string | null> {
    if (resolved.has(domain))
      return Promise.resolve(resolved.get(domain) ?? null);
    const pending = inflight.get(domain);
    if (pending) return pending;
    const task = fetchAndCache(domain)
      .then((uri) => {
        resolved.set(domain, uri);
        return uri;
      })
      .finally(() => inflight.delete(domain));
    inflight.set(domain, task);
    return task;
  },

  /** Synchronous lookup for logos already resolved this session. */
  peek(domain: string): string | null | undefined {
    return resolved.get(domain);
  },
};
