import { anthropic } from "./anthropic";
import { demo } from "./demo";
import { gemini } from "./gemini";
import { openai } from "./openai";
import type { ProviderAdapter, ProviderId } from "./types";

export const PROVIDERS: Record<ProviderId, ProviderAdapter> = { anthropic, openai, gemini, demo };
export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

export function getProvider(id: string): ProviderAdapter {
  if (!isProviderId(id)) throw new Error(`Fournisseur inconnu : ${id}`);
  return PROVIDERS[id];
}

export type { ProviderAdapter, ProviderId } from "./types";
