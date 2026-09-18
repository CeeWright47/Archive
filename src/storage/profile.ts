import { supabase } from "@/lib/supabase";

import {
    type BottomFit,
    type Cuffing,
    type Length,
    type OuterwearFit,
    type TopFit,
} from "./fitVocabulary";
import type { Units } from "./units";

// ---------- Types ----------

export const BUILD_OPTIONS = [
  "Slim",
  "Athletic",
  "Average",
  "Stocky",
  "Broad",
  "Tall",
] as const;
export type Build = (typeof BUILD_OPTIONS)[number];

export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type LetterSize = (typeof LETTER_SIZES)[number];

export const SHOE_WIDTHS = ["D", "E", "EE"] as const;
export type ShoeWidth = (typeof SHOE_WIDTHS)[number];

export const BUDGET_TIERS = ["$", "$$", "$$$", "$$$$"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const CLIMATE_ZONES = [
  "Hot / humid",
  "Warm",
  "Temperate",
  "Cool",
  "Cold",
] as const;
export type ClimateZone = (typeof CLIMATE_ZONES)[number];

export const BUDGET_CATEGORIES = [
  "Tops",
  "Bottoms",
  "Shoes",
  "Outerwear",
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export interface Sizes {
  tops: {
    letter: LetterSize | null;
    neck: number | null;
    sleeve: number | null;
  };
  bottoms: { waist: number | null; inseam: number | null };
  shoes: { size: number | null; width: ShoeWidth | null };
  outerwear: { letter: LetterSize | null };
}

export interface UserProfile {
  name: string | null;
  mobile: string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthYear: number | null;
  build: Build | null;
  sizes: Sizes;
}

export interface FitPreferences {
  tops: TopFit[];
  bottoms: BottomFit[];
  outerwear: OuterwearFit[];
  cuffing: Cuffing | null;
  length: Length | null;
}

export interface ColorPreferences {
  worn: string[];
  avoid: string[];
}

export interface Preferences {
  styleText: string | null;
  fit: FitPreferences;
  colors: ColorPreferences;
  occasions: string[];
  stores: string[];
  budget: Partial<Record<BudgetCategory, BudgetTier>>;
  units: Units;
  climate: { zone: ClimateZone | null; city: string | null };
  autoTag: boolean;
  autoAssess: boolean;
}

export interface StyleProfile {
  id: string;
  rank: string;
  headline: string;
  read: string;
  pillars: string[];
  direction: string;
  activity: string;
}

export interface StyleAssessmentRecord {
  id: string;
  profiles: StyleProfile[];
  sharedPieces: string[];
  inputsHash: string | null;
  createdAt: string;
}

// ---------- Defaults ----------

export const EMPTY_SIZES: Sizes = {
  tops: { letter: null, neck: null, sleeve: null },
  bottoms: { waist: null, inseam: null },
  shoes: { size: null, width: null },
  outerwear: { letter: null },
};

export const EMPTY_PROFILE: UserProfile = {
  name: null,
  mobile: null,
  heightCm: null,
  weightKg: null,
  birthYear: null,
  build: null,
  sizes: EMPTY_SIZES,
};

export const EMPTY_PREFERENCES: Preferences = {
  styleText: null,
  fit: { tops: [], bottoms: [], outerwear: [], cuffing: null, length: null },
  colors: { worn: [], avoid: [] },
  occasions: [],
  stores: [],
  budget: {},
  units: "imperial",
  climate: { zone: null, city: null },
  autoTag: true,
  autoAssess: false,
};

// ---------- Row shapes & validation ----------

type Json = Record<string, unknown>;

function obj(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): T | null {
  return typeof value === "string" &&
    (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function manyOf<T extends string>(value: unknown, options: readonly T[]): T[] {
  return strArray(value).filter((v): v is T =>
    (options as readonly string[]).includes(v),
  );
}

interface UserProfileRow {
  name: string | null;
  mobile: string | null;
  body_info: unknown;
  sizes: unknown;
}

function mapUserProfile(row: UserProfileRow): UserProfile {
  const body = obj(row.body_info);
  const sizes = obj(row.sizes);
  const tops = obj(sizes.tops);
  const bottoms = obj(sizes.bottoms);
  const shoes = obj(sizes.shoes);
  const outerwear = obj(sizes.outerwear);
  return {
    name: row.name,
    mobile: row.mobile,
    heightCm: num(body.height_cm),
    weightKg: num(body.weight_kg),
    birthYear: num(body.birth_year),
    build: oneOf(body.build, BUILD_OPTIONS),
    sizes: {
      tops: {
        letter: oneOf(tops.letter, LETTER_SIZES),
        neck: num(tops.neck),
        sleeve: num(tops.sleeve),
      },
      bottoms: { waist: num(bottoms.waist), inseam: num(bottoms.inseam) },
      shoes: { size: num(shoes.size), width: oneOf(shoes.width, SHOE_WIDTHS) },
      outerwear: { letter: oneOf(outerwear.letter, LETTER_SIZES) },
    },
  };
}

interface PreferencesRow {
  style_text: string | null;
  fit_preferences: unknown;
  colors: unknown;
  occasions: unknown;
  stores: unknown;
  budget: unknown;
  app_settings: unknown;
  climate: unknown;
}

function mapPreferences(row: PreferencesRow): Preferences {
  const fit = obj(row.fit_preferences);
  const colors = obj(row.colors);
  const budget = obj(row.budget);
  const app = obj(row.app_settings);
  const climate = obj(row.climate);
  return {
    styleText: row.style_text,
    fit: {
      tops: strArray(fit.tops) as TopFit[],
      bottoms: strArray(fit.bottoms) as BottomFit[],
      outerwear: strArray(fit.outerwear) as OuterwearFit[],
      cuffing: str(fit.cuffing) as Cuffing | null,
      length: str(fit.length) as Length | null,
    },
    colors: { worn: strArray(colors.worn), avoid: strArray(colors.avoid) },
    occasions: strArray(row.occasions),
    stores: strArray(row.stores),
    budget: Object.fromEntries(
      BUDGET_CATEGORIES.flatMap((category) => {
        const tier = oneOf(budget[category], BUDGET_TIERS);
        return tier ? [[category, tier]] : [];
      }),
    ),
    units:
      oneOf(app.units, ["imperial", "metric"] as const) ??
      EMPTY_PREFERENCES.units,
    climate: {
      zone: oneOf(climate.zone, CLIMATE_ZONES),
      city: str(climate.city),
    },
    autoTag:
      typeof app.auto_tag === "boolean"
        ? app.auto_tag
        : EMPTY_PREFERENCES.autoTag,
    autoAssess:
      typeof app.auto_assess === "boolean"
        ? app.auto_assess
        : EMPTY_PREFERENCES.autoAssess,
  };
}

interface StyleAssessmentRow {
  id: string;
  profiles: unknown;
  inputs_hash: string | null;
  created_at: string;
}

function mapStyleProfile(value: unknown, index: number): StyleProfile | null {
  const p = obj(value);
  const headline = str(p.headline);
  if (!headline) return null;
  return {
    id: str(p.id) ?? `profile-${index}`,
    rank: str(p.rank) ?? "",
    headline,
    read: str(p.read) ?? "",
    pillars: strArray(p.pillars),
    direction: str(p.direction) ?? "",
    activity: str(p.activity) ?? "",
  };
}

// `profiles` is stored as an array; a top-level `shared_pieces` may ride along as a
// trailing `{ shared_pieces: [...] }` entry or be absent entirely.
function mapStyleAssessment(
  row: StyleAssessmentRow,
): StyleAssessmentRecord | null {
  const raw = Array.isArray(row.profiles) ? row.profiles : [];
  const profiles: StyleProfile[] = [];
  let sharedPieces: string[] = [];
  raw.forEach((entry, index) => {
    const e = obj(entry);
    if (Array.isArray(e.shared_pieces)) {
      sharedPieces = strArray(e.shared_pieces);
      return;
    }
    const profile = mapStyleProfile(entry, index);
    if (profile) profiles.push(profile);
  });
  if (profiles.length === 0) return null;
  return {
    id: row.id,
    profiles,
    sharedPieces,
    inputsHash: row.inputs_hash,
    createdAt: row.created_at,
  };
}

// ---------- Access ----------

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export const profileStore = {
  async getUserProfile(): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("user_profile")
      .select("name, mobile, body_info, sizes")
      .maybeSingle();
    if (error) throw error;
    return data ? mapUserProfile(data as UserProfileRow) : EMPTY_PROFILE;
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase.from("user_profile").upsert({
      user_id: userId,
      name: profile.name,
      mobile: profile.mobile,
      body_info: {
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        birth_year: profile.birthYear,
        build: profile.build,
      },
      sizes: profile.sizes,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async getPreferences(): Promise<Preferences> {
    const { data, error } = await supabase
      .from("preferences")
      .select(
        "style_text, fit_preferences, colors, occasions, stores, budget, app_settings, climate",
      )
      .maybeSingle();
    if (error) throw error;
    return data ? mapPreferences(data as PreferencesRow) : EMPTY_PREFERENCES;
  },

  async savePreferences(prefs: Preferences): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase.from("preferences").upsert({
      user_id: userId,
      style_text: prefs.styleText,
      fit_preferences: prefs.fit,
      colors: prefs.colors,
      occasions: prefs.occasions,
      stores: prefs.stores,
      budget: prefs.budget,
      app_settings: {
        units: prefs.units,
        auto_tag: prefs.autoTag,
        auto_assess: prefs.autoAssess,
      },
      climate: prefs.climate,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async getLatestAssessment(): Promise<StyleAssessmentRecord | null> {
    const { data, error } = await supabase
      .from("style_assessments")
      .select("id, profiles, inputs_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapStyleAssessment(data as StyleAssessmentRow) : null;
  },

  async saveAssessment(
    profiles: StyleProfile[],
    sharedPieces: string[],
    inputsHash: string | null,
  ): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase.from("style_assessments").insert({
      user_id: userId,
      profiles: [...profiles, { shared_pieces: sharedPieces }],
      inputs_hash: inputsHash,
    });
    if (error) throw error;
  },
};
