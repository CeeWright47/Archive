import { closetSummary, getStyleContext } from "../_shared/archive.ts";
import { askAnthropic, serveWorkflow } from "../_shared/runtime.ts";

serveWorkflow(async ({ supabase, user }) => {
  const { pieces, styleText, inspo } = await getStyleContext(supabase, user.id);
  const { data: wants, error } = await supabase
    .from("wants")
    .select("item, owned")
    .eq("user_id", user.id)
    .eq("owned", false);
  if (error) throw error;
  const inspoNotes = inspo.length
    ? `\n\nInspo board — the aesthetic they're building toward:\n${inspo.map((item) => `- ${item.vibe ?? ""}`).join("\n")}`
    : "";
  const wantsNote = wants?.length
    ? `\n\nAlready shortlisted from scanning (do NOT repeat these — they are already on the user's radar):\n${wants.map((want) => `- ${want.item}`).join("\n")}`
    : "";
  const result = await askAnthropic(
    "",
    [
      {
        type: "text",
        text: `You are a wardrobe consultant. Style profile: ${styleText}${inspoNotes}${wantsNote}\n\nTheir full closet:\n${closetSummary(pieces)}\n\nFind the gaps between the closet they have and the aesthetic they're building toward. Be ruthless about priority — name only pieces that would unlock multiple new outfits from what they ALREADY own, not a generic wardrobe checklist. Respond ONLY with JSON, no markdown: {"verdict": "one sentence on how complete this wardrobe already is", "items": [{"item": "specific piece e.g. 'black lug-sole penny loafer'", "why": "one sentence — what it unlocks with pieces they own", "price": "rough price range like '$90-150'", "priority": 1-5 where 1 is buy first}], "stop_buying": "one category they already have enough of"}`,
      },
    ],
    1600,
  );
  const items = Array.isArray(result.items)
    ? result.items
        .sort((a: any, b: any) => (a.priority ?? 9) - (b.priority ?? 9))
        .map((item: any) => ({ ...item, owned: false }))
    : [];
  const stored = { ...result, items };
  const { error: saveError } = await supabase.from("settings").upsert(
    {
      user_id: user.id,
      key: "closet-gaps",
      value: JSON.stringify(stored),
    },
    { onConflict: "user_id,key" },
  );
  if (saveError) throw saveError;
  return stored;
});
