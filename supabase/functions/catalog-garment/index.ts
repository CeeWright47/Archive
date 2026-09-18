import { askAnthropic, imageBlock, serveWorkflow } from "../_shared/runtime.ts";

const CATEGORIES = ["top", "bottom", "shoes", "outerwear", "accessory"];
const FREE_PIECE_LIMIT = 50;

serveWorkflow(async ({ body, supabase, user }) => {
  const [{ data: profile, error: profileError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("user_profile")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("pieces")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
  if (profileError) throw profileError;
  if (countError) throw countError;
  const pieceCount = count ?? 0;
  if ((profile?.plan ?? "free") === "free" && pieceCount >= FREE_PIECE_LIMIT) {
    return {
      limit_reached: true,
      piece_count: pieceCount,
      limit: FREE_PIECE_LIMIT,
    };
  }

  return askAnthropic("", [
    imageBlock(body.image),
    {
      type: "text",
      text: `Catalog this clothing item. Respond ONLY with JSON, no markdown: {"name": "short specific name e.g. 'Espresso lug-sole loafer'", "category": one of ${JSON.stringify(CATEGORIES)}, "color": "primary color", "material": "best guess material", "vibe": "one short phrase on the aesthetic", "seasons": ["applicable seasons"]}`,
    },
  ]);
});
