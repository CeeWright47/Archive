import { askAnthropic, imageBlock, serveWorkflow } from "../_shared/runtime.ts";

serveWorkflow(async ({ body }) =>
  askAnthropic("", [
    imageBlock(body.image),
    {
      type: "text",
      text: `This is a style inspiration image (e.g. a Pinterest save or an outfit photo). Distill its aesthetic. Respond ONLY with JSON, no markdown: {"vibe": "one dense sentence capturing the silhouette, palette, textures, and overall aesthetic direction"}`,
    },
  ]),
);
