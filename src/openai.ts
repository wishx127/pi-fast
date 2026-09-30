// Fast availability is model- and credential-specific. Add models only after
// checking the provider's published support, not by matching a GPT prefix.
const supportedModels = new Set([
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.5",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
  "openai/gpt-6-astra",
  "openai/gpt-6.1-sol",
  "openai-codex/gpt-5.4",
  "openai-codex/gpt-5.5",
  "openai-codex/gpt-5.6-sol",
  "openai-codex/gpt-5.6-terra",
  "openai-codex/gpt-5.6-luna",
  "openai-codex/gpt-6-astra",
  "openai-codex/gpt-6-sol",
  "openai-codex/gpt-6-luna",
  "openai-codex/gpt-6.1-sol",
]);

type Model = { provider: string; id: string } | undefined;

export function supportsOpenAIFast(model: Model): boolean {
  return model !== undefined && supportedModels.has(`${model.provider}/${model.id}`);
}

export function applyOpenAIFast(model: Model, payload: unknown): unknown | undefined {
  if (!model || !supportsOpenAIFast(model) || !payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const request = payload as Record<string, unknown>;
  if (request.model !== model.id || "service_tier" in request) return;
  return { ...request, service_tier: "priority" };
}
