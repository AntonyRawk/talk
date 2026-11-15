import Anthropic from "@anthropic-ai/sdk";
import type { ProviderAdapter } from "./types";

export const anthropic: ProviderAdapter = {
  id: "anthropic",
  label: "Claude (Anthropic)",
  defaultModel: "claude-opus-5-5",
  keyHelpUrl: "https://console.anthropic.com/settings/keys",

  async *streamText({ apiKey, model, system, prompt, signal }) {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: prompt }],
      },
      { signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield "\n\n(Le modèle a refusé de répondre à cette demande.)";
    }
  },

  async listModels(apiKey) {
    const client = new Anthropic({ apiKey });
    const models = [];
    for await (const m of client.models.list()) models.push({ id: m.id, label: m.display_name });
    return models;
  },
};
