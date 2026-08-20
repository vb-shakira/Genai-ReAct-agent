import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type ProviderId = "lovable" | "groq";

export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Resolve the reasoning model for the requested provider.
 * - "lovable": Lovable AI Gateway (Responses API) — no user key needed.
 * - "groq": user-supplied GROQ_API_KEY, OpenAI-compatible endpoint.
 */
export function resolveModel(provider: ProviderId): {
  model: LanguageModel;
  label: string;
} {
  if (provider === "groq") {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "Groq is not configured yet. Add a GROQ_API_KEY secret to use the Groq provider.",
      );
    }
    const groq = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey,
    });
    const modelId = process.env["GROQ_MODEL"] || GROQ_DEFAULT_MODEL;
    return { model: groq(modelId), label: `Groq · ${modelId}` };
  }

  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!lovableApiKey) throw new Error("Missing LOVABLE_API_KEY");

  const gateway = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableApiKey,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  return {
    model: gateway("openai/gpt-5.6-sol"),
    label: "Lovable AI · openai/gpt-5.6-sol",
  };
}
