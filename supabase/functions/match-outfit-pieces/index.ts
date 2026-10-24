import {
    askAnthropic,
    FunctionError,
    imageBlock,
    serveWorkflow,
} from "../_shared/runtime.ts";

// Below this the model is guessing, and a wrong tag costs the person more
// than a missing one.
const MIN_CONFIDENCE = 0.5;

const SYSTEM_PROMPT = `You tag which garments from a person's closet appear in a photo of an outfit they wore.

You get one outfit photo and their closet as a text list, one piece per line, starting with the piece id in brackets.

Only include a piece if you can actually see it worn in the photo and it plausibly matches that closet entry's category, color, and material. Leave out anything you cannot see: shoes cropped out of frame, a layer hidden under another, accessories too small to make out. When two closet pieces could both match what you see, include only the one that fits best, and lower your confidence. A missing tag is better than a wrong one.

Respond ONLY with JSON, no markdown:
{"matches": [{"piece_id": "id from the closet list", "confidence": 0.0-1.0}]}

Return {"matches": []} if nothing in the closet is clearly visible.`;

interface PieceRow {
  id: string;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  material: string | null;
  brand: string | null;
}

function closetLine(piece: PieceRow): string {
  const details = [
    piece.category,
    piece.subcategory,
    piece.color,
    piece.material,
    piece.brand,
  ].filter((value): value is string => Boolean(value?.trim()));
  return `[${piece.id}] ${piece.name ?? "Unnamed piece"} — ${details.join(", ")}`;
}

serveWorkflow(async ({ body, supabase, user }) => {
  const [{ data: profile, error: profileError }, { data, error }] =
    await Promise.all([
      supabase
        .from("user_profile")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("pieces")
        .select("id, name, category, subcategory, color, material, brand")
        .eq("user_id", user.id),
    ]);
  if (profileError) throw profileError;
  if (error) throw error;
  if ((profile?.plan ?? "free") === "free") {
    throw new FunctionError(
      "plan_required",
      "Suggested pieces are available with Pro.",
      403,
    );
  }

  const closet = (data ?? []) as PieceRow[];
  if (closet.length === 0) return { matches: [] };

  const result = await askAnthropic(SYSTEM_PROMPT, [
    imageBlock(body.image),
    { type: "text", text: `CLOSET\n${closet.map(closetLine).join("\n")}` },
  ]);

  const closetIds = new Set(closet.map((piece) => piece.id));
  const best = new Map<string, number>();
  for (const value of Array.isArray(result.matches) ? result.matches : []) {
    if (!value || typeof value !== "object") continue;
    const { piece_id: id, confidence } = value as Record<string, unknown>;
    if (typeof id !== "string" || !closetIds.has(id)) continue;
    if (typeof confidence !== "number" || confidence < MIN_CONFIDENCE) continue;
    best.set(id, Math.max(best.get(id) ?? 0, Math.min(confidence, 1)));
  }

  return {
    matches: [...best]
      .sort(([, a], [, b]) => b - a)
      .map(([piece_id, confidence]) => ({ piece_id, confidence })),
  };
});
