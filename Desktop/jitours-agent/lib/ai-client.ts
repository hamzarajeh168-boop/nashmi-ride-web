import Anthropic from "@anthropic-ai/sdk";

// OpenRouter keys (sk-or-…) use its Anthropic-compatible endpoint with a Bearer token.
export function createAiClient(apiKey: string) {
  const baseURL = process.env.ANTHROPIC_BASE_URL || (apiKey.startsWith("sk-or-") ? "https://openrouter.ai/api" : undefined);
  const client = baseURL ? new Anthropic({ baseURL, apiKey: null, authToken: apiKey }) : new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || (baseURL ? "anthropic/claude-sonnet-5.5" : "claude-sonnet-5-5");
  return { client, model };
}
