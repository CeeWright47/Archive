import { closetSummary } from "../_shared/archive.ts";
import { askAnthropic, serveWorkflow } from "../_shared/runtime.ts";

serveWorkflow(async ({ body, supabase, user }) => {
  const anchorId =
    typeof body.anchorPieceId === "string" ? body.anchorPieceId : "";
  const { data: anchor, error: anchorError } = await supabase
    .from("pieces")
    .select("id, name, category, color, material, vibe")
    .eq("user_id", user.id)
    .eq("id", anchorId)
    .single();
  if (anchorError) throw anchorError;
  const { data: others, error } = await supabase
    .from("pieces")
    .select("id, name, category, color, material, vibe")
    .eq("user_id", user.id)
    .neq("id", anchorId);
  if (error) throw error;
  return askAnthropic("", [
    {
      type: "text",
      text: `You are a stylist. Anchor piece: "${anchor.name}" — ${anchor.category}, ${anchor.color}${anchor.material ? ", " + anchor.material : ""}. ${anchor.vibe || ""}\n\nCloset:\n${closetSummary(others ?? [])}\n\nIn one sentence, what does this piece want to be worn with? Then pick up to 6 piece IDs from the closet that pair best.\n\nRespond ONLY with JSON, no markdown: {"sentence": "one styling sentence", "pair_ids": ["id1", "id2"]}`,
    },
  ]);
});
