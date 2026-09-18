import {
    createClient,
    type SupabaseClient,
    type User,
} from "npm:@supabase/supabase-js@2";

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: "image/jpeg"; data: string };
    };

export interface FunctionContext {
  body: Record<string, unknown>;
  supabase: SupabaseClient;
  user: User;
}

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function serveWorkflow(
  workflow: (context: FunctionContext) => Promise<unknown>,
): void {
  Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Supabase environment is not configured" }, 503);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return json({ error: "Invalid or expired authentication" }, 401);
    }

    try {
      const parsed = await request.json();
      const body = parsed && typeof parsed === "object" ? parsed : {};
      return json(await workflow({ body, supabase, user: data.user }));
    } catch (error) {
      console.error(error);
      return json({ error: errorMessage(error) }, 400);
    }
  });
}

export async function askAnthropic(
  system: string,
  content: AnthropicContentBlock[],
  maxTokens = 1000,
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Anthropic API is not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content }],
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message ?? "Anthropic request failed");
  }
  if (result?.stop_reason === "max_tokens") {
    throw new Error(
      "Anthropic response was truncated because it reached the maximum token limit",
    );
  }

  const text = Array.isArray(result.content)
    ? result.content
        .map((block: { text?: string }) => block.text ?? "")
        .join("")
    : "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Anthropic returned an invalid JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function imageBlock(base64: unknown): AnthropicContentBlock {
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("A JPEG image is required");
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: base64.includes(",")
        ? base64.slice(base64.indexOf(",") + 1)
        : base64,
    },
  };
}
