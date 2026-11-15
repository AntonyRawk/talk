import { GoogleGenAI } from "@google/genai";
import type { ProviderAdapter } from "./types";

export const gemini: ProviderAdapter = {
  id: "gemini",
  label: "Gemini (Google)",
  defaultModel: "gemini-2.5-flash",
  keyHelpUrl: "https://aistudio.google.com/apikey",

  async *streamText({ apiKey, model, system, prompt, json, signal }) {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        abortSignal: signal,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  },

  async listModels(apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const models = [];
    const pager = await ai.models.list();
    for await (const m of pager) {
      if (!m.name || !m.supportedActions?.includes("generateContent")) continue;
      const id = m.name.replace(/^models\//, "");
      models.push({ id, label: m.displayName ?? id });
    }
    return models;
  },
};
