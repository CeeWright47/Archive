import { getStyleContext } from "../_shared/archive.ts";
import { askAnthropic, serveWorkflow } from "../_shared/runtime.ts";

const NO_MATCHING_STYLE = "No matching style";

interface AssessmentProfile {
  id: string;
  headline: string;
  read: string;
  pillars: string[];
}

interface FitToClassify {
  id: string;
  title: string;
  occasion: string;
  pieceIds: string[];
  why: string;
}

interface StyleAssignment {
  fit_id: string;
  style_profile_id: string | null;
  style_profile_name: string;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function getCurrentProfiles(
  supabase: Parameters<Parameters<typeof serveWorkflow>[0]>[0]["supabase"],
  userId: string,
): Promise<AssessmentProfile[]> {
  const { data, error } = await supabase
    .from("style_assessments")
    .select("profiles")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!Array.isArray(data?.profiles)) return [];
  return data.profiles.flatMap((value: unknown) => {
    const profile = asObject(value);
    if (
      typeof profile.id !== "string" ||
      typeof profile.headline !== "string"
    ) {
      return [];
    }
    return [
      {
        id: profile.id,
        headline: profile.headline,
        read: typeof profile.read === "string" ? profile.read : "",
        pillars: strings(profile.pillars),
      },
    ];
  });
}

async function classifyFits(
  profiles: AssessmentProfile[],
  fits: FitToClassify[],
  pieceNames: Map<string, string>,
): Promise<StyleAssignment[]> {
  if (profiles.length === 0) {
    return fits.map((fit) => ({
      fit_id: fit.id,
      style_profile_id: null,
      style_profile_name: NO_MATCHING_STYLE,
    }));
  }

  const profileText = profiles
    .map(
      (profile) =>
        `[${profile.id}] ${profile.headline}\n${profile.read}\nPillars: ${profile.pillars.join(" · ")}`,
    )
    .join("\n\n");
  const fitText = fits
    .map((fit) => {
      const names = fit.pieceIds.map((id) => pieceNames.get(id) ?? id);
      return `[${fit.id}] ${fit.title} — ${fit.occasion}\nPieces: ${names.join(", ")}\n${fit.why}`;
    })
    .join("\n\n");
  const result = await askAnthropic(
    "",
    [
      {
        type: "text",
        text: `Assign each generated outfit to the single style profile it most clearly belongs to. Match on the profile's actual style codes, not its rank. If an outfit does not coherently fit any profile, return null for style_profile_id. Do not force a match.\n\nSTYLE PROFILES\n${profileText}\n\nGENERATED OUTFITS\n${fitText}\n\nRespond ONLY with JSON, no markdown: {"assignments": [{"fit_id": "exact fit id", "style_profile_id": "exact profile id, or null"}]}`,
      },
    ],
    2000,
  );
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  const requested = new Map(
    (Array.isArray(result.assignments) ? result.assignments : []).flatMap(
      (value: unknown) => {
        const assignment = asObject(value);
        return typeof assignment.fit_id === "string"
          ? [[assignment.fit_id, assignment.style_profile_id]]
          : [];
      },
    ),
  );
  return fits.map((fit) => {
    const profileId = requested.get(fit.id);
    const profile =
      typeof profileId === "string" ? profilesById.get(profileId) : undefined;
    return {
      fit_id: fit.id,
      style_profile_id: profile?.id ?? null,
      style_profile_name: profile?.headline ?? NO_MATCHING_STYLE,
    };
  });
}

serveWorkflow(async ({ body, supabase, user }) => {
  const { pieces, styleText, inspo } = await getStyleContext(supabase, user.id);
  const profiles = await getCurrentProfiles(supabase, user.id);
  const pieceNames = new Map(
    pieces.map((piece) => [piece.id, piece.name ?? "Unnamed piece"]),
  );

  if (body.classifyExisting === true) {
    const { data, error } = await supabase
      .from("fits")
      .select("id, title, occasion, piece_ids, why")
      .eq("user_id", user.id)
      .is("style_profile_name", null);
    if (error) throw error;
    const unlabeled = (data ?? []).map((fit) => ({
      id: fit.id,
      title: fit.title ?? "Untitled fit",
      occasion: fit.occasion ?? "Everyday",
      pieceIds: Array.isArray(fit.piece_ids) ? fit.piece_ids : [],
      why: fit.why ?? "",
    }));
    const assignments = await classifyFits(profiles, unlabeled, pieceNames);
    for (const assignment of assignments) {
      const { error: updateError } = await supabase
        .from("fits")
        .update({
          style_profile_id: assignment.style_profile_id,
          style_profile_name: assignment.style_profile_name,
        })
        .eq("user_id", user.id)
        .eq("id", assignment.fit_id)
        .is("style_profile_name", null);
      if (updateError) throw updateError;
    }
    return { assignments };
  }

  const occasion = typeof body.occasion === "string" ? body.occasion : "";
  const anchorId =
    typeof body.anchorPieceId === "string" ? body.anchorPieceId : null;
  const anchor = anchorId
    ? pieces.find((piece) => piece.id === anchorId)
    : null;
  const inspoNotes = inspo.length
    ? `\n\nInspo board (aesthetics they're drawn to — let these steer silhouette and styling):\n${inspo.map((item) => `- ${item.vibe ?? ""}`).join("\n")}`
    : "";
  const clothing = pieces.filter((piece) => piece.category !== "accessory");
  const accessories = pieces.filter((piece) => piece.category === "accessory");
  const clothingSummary = clothing
    .map(
      (piece) =>
        `[${piece.id}] ${piece.name} — ${piece.category}, ${piece.color}, ${piece.material}. ${piece.vibe}`,
    )
    .join("\n");
  const accessorySummary = accessories.length
    ? accessories
        .map(
          (piece) =>
            `[${piece.id}] ${piece.name} — ${piece.color}. ${piece.vibe}`,
        )
        .join("\n")
    : "(none)";
  const result = await askAnthropic(
    "",
    [
      {
        type: "text",
        text: `You are a personal stylist with sharp editorial instincts. Style profile: ${styleText}${inspoNotes}${anchor ? `\n\n— MANDATORY ANCHOR —\nThis outfit MUST be built around [${anchor.id}] "${anchor.name}" (${anchor.category}). It MUST appear in piece_ids. Let its color palette and silhouette drive every other selection.` : ""}\n\n— CLOTHING (build the fit exclusively from these) —\n${clothingSummary}\n\n— ACCESSORIES: hats, caps, bags, jewelry (do NOT put these in piece_ids; only suggest one in optional_piece_ids if it truly completes this specific look — default is an empty array) —\n${accessorySummary}\n\nBuild one outfit for: "${occasion || "an everyday fit"}".\n\n1. Pick 3-5 clothing pieces that work together for the occasion, style profile, and color story. Rotate the closet — avoid defaulting to the same pieces every time.\n2. Only after the core fit is done: decide if any single accessory genuinely elevates it. If uncertain, leave optional_piece_ids empty.\n\nRespond ONLY with JSON, no markdown: {"title": "evocative 3-5 word fit name", "piece_ids": ["clothing ids only — absolutely no accessories here"], "optional_piece_ids": ["one accessory id if it genuinely elevates this look, otherwise []"], "why": "2-3 sentences on why this core combination works", "missing": "one piece not in the closet that would elevate this fit, or null"}`,
      },
    ],
    1200,
  );
  const [assignment] = await classifyFits(
    profiles,
    [
      {
        id: "new-fit",
        title: typeof result.title === "string" ? result.title : "Untitled fit",
        occasion: occasion || "Everyday",
        pieceIds: [
          ...strings(result.piece_ids),
          ...strings(result.optional_piece_ids),
        ],
        why: typeof result.why === "string" ? result.why : "",
      },
    ],
    pieceNames,
  );
  return {
    ...result,
    style_profile_id: assignment.style_profile_id,
    style_profile_name: assignment.style_profile_name,
  };
});
