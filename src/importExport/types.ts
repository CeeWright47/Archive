// Shape of the JSON export produced by the web app.
// Field names beyond the ones referenced below are unknown here and passed through as-is —
// reconcile with the web app's actual export types when this import is wired up for real.

export interface WebExportPiece {
  id: string;
  [key: string]: unknown;
}

export interface WebExportOutfit {
  id: string;
  /** Base64-encoded image data (optionally as data URIs) from the web export. */
  images?: string[];
  [key: string]: unknown;
}

export interface WebExportPreferences {
  [key: string]: unknown;
}

export interface WebExportUser {
  id: string;
  [key: string]: unknown;
}

export interface WebExportAssessment {
  [key: string]: unknown;
}

export interface WebExport {
  pieces: WebExportPiece[];
  outfits: WebExportOutfit[];
  preferences: WebExportPreferences;
  user: WebExportUser;
  assessment: WebExportAssessment;
}
