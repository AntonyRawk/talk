import OpenAI from "openai";
import type { ProviderAdapter } from "./types";

// Les modèles de chat ; on écarte embeddings, audio, images, modération...
const NON_CHAT = /embedding|whisper|tts|dall-e|image|audio|moderation|realtime|transcribe|search|davinci|babbage/i;

export const openai: ProviderAdapter = {
  id: "openai",
  label: "ChatGPT (OpenAI)",
  defaultModel: "gpt-5",
  keyHelpUrl: "https://platform.openai.com/api-keys",

  async *streamText({ apiKey, model, system, prompt, json, signal }) {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create(
      {
        model,
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        ...(json ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal },
    );
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  },

  async listModels(apiKey) {
    const client = new OpenAI({ apiKey });
    const models = [];
    for await (const m of client.models.list()) {
      if (!NON_CHAT.test(m.id)) models.push({ id: m.id, label: m.id });
    }
    return models.sort((a, b) => a.id.localeCompare(b.id));
  },
};
