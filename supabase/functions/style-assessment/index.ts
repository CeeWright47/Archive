import {
    closetSummary,
    freshProfileId,
    getStyleContext,
    inputsHash,
} from "../_shared/archive.ts";
import { ASSESSMENT_SYSTEM_PROMPT } from "../_shared/assessmentPrompt.ts";
import {
    askAnthropic,
    imageBlock,
    serveWorkflow,
    type AnthropicContentBlock,
} from "../_shared/runtime.ts";

const RANKS = ["primary", "secondary", "tertiary", "quaternary"];

serveWorkflow(async ({ body, supabase, user }) => {
  if (body.checkOnly !== true) {
    const [
      { data: profile, error: profileError },
      { count, error: countError },
    ] = await Promise.all([
      supabase
        .from("user_profile")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("style_assessments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    if (profileError) throw profileError;
    if (countError) throw countError;
    if ((profile?.plan ?? "free") === "free" && (count ?? 0) >= 1) {
      return { limit_reached: true, assessment_count: count, limit: 1 };
    }
  }

  const { pieces, styleText, inspo } = await getStyleContext(supabase, user.id);
  const outfitIds = Array.isArray(body.outfitIds)
    ? body.outfitIds.filter((id): id is string => typeof id === "string")
    : [];
  const outfitImages = Array.isArray(body.outfitImages)
    ? body.outfitImages.slice(0, 8)
    : [];
  const hash = await inputsHash({
    styleText,
    pieceIds: pieces.map((piece) => piece.id),
    inspoIds: inspo.map((item) => item.id),
    outfitIds,
  });
  if (body.checkOnly === true) return { inputs_hash: hash };
  const { data: previous, error } = await supabase
    .from("style_assessments")
    .select("profiles")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const priorProfiles = Array.isArray(previous?.profiles)
    ? previous.profiles.filter(
        (profile: unknown) =>
          profile &&
          typeof profile === "object" &&
          !(profile as Record<string, unknown>).shared_pieces,
      )
    : [];
  const content: AnthropicContentBlock[] = [
    {
      type: "text",
      text: `STATED STYLE\n${styleText || "(No stated style yet.)"}\n\nCLOSET\n${closetSummary(pieces) || "(No closet pieces yet.)"}`,
    },
    ...inspo.flatMap((item) => (item.image ? [imageBlock(item.image)] : [])),
    {
      type: "text",
      text: `INSPO\n${inspo.length ? inspo.map((item) => `- ${item.vibe ?? ""}`).join("\n") : "(No inspo images yet.)"}`,
    },
    ...outfitImages.map(imageBlock),
    {
      type: "text",
      text: `SELF_FITS\n${outfitIds.length ? `${outfitIds.length} self-outfit photos supplied above.` : "(No self-outfit photos logged yet.)"}\n\nPREVIOUS PROFILES\n${priorProfiles.length ? priorProfiles.map((profile: any) => `- id ${profile.id}: "${profile.headline}" — ${profile.read}`).join("\n") : "(No previous assessment.)"}`,
    },
  ];
  const result = await askAnthropic(ASSESSMENT_SYSTEM_PROMPT, content, 4096);
  const priorIds = new Set(
    priorProfiles
      .map((profile: any) => profile.id)
      .filter((id: unknown): id is string => typeof id === "string"),
  );
  const claimed = new Set<string>();
  const rawProfiles = Array.isArray(result.profiles)
    ? result.profiles.slice(0, 4)
    : [];
  const profiles = rawProfiles
    .map((value: unknown, index: number) => {
      const profile =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};
      const claim =
        typeof profile.continues_id === "string" ? profile.continues_id : null;
      const id =
        claim && priorIds.has(claim) && !claimed.has(claim)
          ? claim
          : freshProfileId();
      if (id === claim) claimed.add(id);
      return {
        id,
        rank: RANKS.includes(String(profile.rank))
          ? profile.rank
          : RANKS[index],
        headline: String(profile.headline ?? "Style profile"),
        read: String(profile.read ?? ""),
        pillars: Array.isArray(profile.pillars)
          ? profile.pillars
              .filter((item): item is string => typeof item === "string")
              .slice(0, 4)
          : [],
        direction: String(profile.direction ?? "stable"),
        activity: profile.activity === "dormant" ? "dormant" : "active",
        continues_id: id === claim ? claim : null,
      };
    })
    .sort(
      (left, right) =>
        RANKS.indexOf(String(left.rank)) - RANKS.indexOf(String(right.rank)),
    );
  if (profiles.length < 2)
    throw new Error("Assessment must return at least two profiles");
  const sharedPieces = Array.isArray(result.shared_pieces)
    ? result.shared_pieces.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const { data: saved, error: saveError } = await supabase
    .from("style_assessments")
    .insert({
      user_id: user.id,
      profiles: [...profiles, { shared_pieces: sharedPieces }],
      inputs_hash: hash,
    })
    .select("id, created_at")
    .single();
  if (saveError) throw saveError;
  return {
    id: saved.id,
    profiles,
    shared_pieces: sharedPieces,
    inputs_hash: hash,
    created_at: saved.created_at,
  };
});
