import { supabase } from "@/lib/supabase";

// The settings table holds a handful of key/value rows produced by earlier style analysis —
// see src/app/profile.tsx for where these are rendered.
export interface ClosetGapItem {
  item: string;
  why: string;
  price: string;
  priority: number;
  owned: boolean;
}

export interface ClosetGaps {
  verdict: string;
  items: ClosetGapItem[];
  stopBuying: string;
}

export interface StyleAssessment {
  headline: string;
  read: string;
}

export interface ProfileSettings {
  styleProfile: string | null;
  styleAssessment: StyleAssessment | null;
  closetGaps: ClosetGaps | null;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const settings = {
  async getProfileSettings(): Promise<ProfileSettings> {
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["style-profile", "style-assessment", "closet-gaps"]);
    if (error) throw error;

    const byKey = new Map((data ?? []).map((row) => [row.key, row.value as string | null]));

    const assessment = safeParse<{ headline?: string; read?: string }>(
      byKey.get("style-assessment") ?? null,
    );
    const gaps = safeParse<{
      verdict?: string;
      items?: ClosetGapItem[];
      stop_buying?: string;
    }>(byKey.get("closet-gaps") ?? null);

    return {
      styleProfile: byKey.get("style-profile") ?? null,
      styleAssessment: assessment
        ? { headline: assessment.headline ?? "", read: assessment.read ?? "" }
        : null,
      closetGaps: gaps
        ? {
            verdict: gaps.verdict ?? "",
            items: gaps.items ?? [],
            stopBuying: gaps.stop_buying ?? "",
          }
        : null,
    };
  },

  async setClosetGapOwned(index: number, owned: boolean): Promise<ClosetGaps> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "closet-gaps")
      .maybeSingle();
    if (error) throw error;

    const gaps = safeParse<{
      verdict?: string;
      items?: ClosetGapItem[];
      stop_buying?: string;
    }>(data?.value ?? null);
    if (!gaps || !gaps.items || !gaps.items[index]) {
      throw new Error("Closet gap item not found");
    }

    const nextItems = gaps.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, owned } : item,
    );
    const nextGaps = { ...gaps, items: nextItems };

    const { error: updateError } = await supabase
      .from("settings")
      .update({ value: JSON.stringify(nextGaps) })
      .eq("user_id", user.id)
      .eq("key", "closet-gaps");
    if (updateError) throw updateError;

    return {
      verdict: nextGaps.verdict ?? "",
      items: nextItems,
      stopBuying: nextGaps.stop_buying ?? "",
    };
  },
};
