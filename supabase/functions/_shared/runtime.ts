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

const ANTHROPIC_TIMEOUT_MS = 45000;

// Thrown by workflows to produce a specific {code, message} error response
// instead of the generic internal_error fallback.
export class FunctionError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "FunctionError";
    this.code = code;
    this.status = status;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorJson(code: string, message: string, status: number): Response {
  return json({ code, message }, status);
}

export function serveWorkflow(
  workflow: (context: FunctionContext) => Promise<unknown>,
): void {
  Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return errorJson(
        "method_not_allowed",
        "This request method isn't supported.",
        405,
      );
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return errorJson(
        "auth_required",
        "You need to be signed in to do that.",
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return errorJson(
        "config_error",
        "The server isn't configured correctly. Please try again later.",
        503,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return errorJson(
        "auth_invalid",
        "Your session has expired. Please sign in again.",
        401,
      );
    }

    try {
      const parsed = await request.json();
      const body = parsed && typeof parsed === "object" ? parsed : {};
      return json(await workflow({ body, supabase, user: data.user }));
    } catch (error) {
      console.error(error);
      if (error instanceof FunctionError) {
        return errorJson(error.code, error.message, error.status);
      }
      return errorJson(
        "internal_error",
        "Something went wrong. Please try again.",
        500,
      );
    }
  });
}

export async function askAnthropic(
  system: string,
  content: AnthropicContentBlock[],
  maxTokens = 1000,
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new FunctionError(
      "upstream_error",
      "The AI service isn't configured. Please try again later.",
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
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
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FunctionError(
        "upstream_timeout",
        "That took too long to respond. Please try again.",
        504,
      );
    }
    throw new FunctionError(
      "upstream_error",
      "Couldn't reach the AI service. Please try again.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }

  const result = await response.json();
  if (!response.ok) {
    throw new FunctionError(
      "upstream_error",
      "The AI service had a problem handling that request. Please try again.",
      502,
    );
  }
  if (result?.stop_reason === "max_tokens") {
    throw new FunctionError(
      "upstream_error",
      "The AI response was too long to finish. Please try again.",
      502,
    );
  }

  const text = Array.isArray(result.content)
    ? result.content
        .map((block: { text?: string }) => block.text ?? "")
        .join("")
    : "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FunctionError(
      "upstream_error",
      "Got an unexpected response from the AI service. Please try again.",
      502,
    );
  }
  return parsed as Record<string, unknown>;
}

export function imageBlock(base64: unknown): AnthropicContentBlock {
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new FunctionError("invalid_request", "A photo is required for that.", 400);
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
