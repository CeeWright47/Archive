import { closetSummary, getStyleContext } from "../_shared/archive.ts";
import { askAnthropic, imageBlock, serveWorkflow } from "../_shared/runtime.ts";

serveWorkflow(async ({ body, supabase, user }) => {
  const { pieces, styleText } = await getStyleContext(supabase, user.id);
  return askAnthropic(
    "",
    [
      imageBlock(body.image),
      {
        type: "text",
        text: `You're advising a shopper in a store. Their style profile: ${styleText}\n\nTheir closet:\n${closetSummary(pieces) || "(empty)"}\n\nJudge the item in the photo against their style and closet. Be honest — skip means skip. Respond ONLY with JSON, no markdown: {"verdict": "cop" | "skip" | "maybe", "score": 1-10 fit with their wardrobe, "take": "2-3 blunt sentences — does it match the profile, does it duplicate anything, what gap does it fill", "pairs_with": ["ids of up to 3 closet pieces it works with"], "item": "short specific name for this piece e.g. 'Black lug-sole penny loafer'", "price": "rough price range like '$180-240' if inferable from the photo, else null"}`,
      },
    ],
    1200,
  );
});
