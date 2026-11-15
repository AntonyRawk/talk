export type ProviderId = "anthropic" | "openai" | "gemini" | "demo";

export type GenerateRequest = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  /** Demande une réponse en JSON (synthèse et évaluation). */
  json?: boolean;
  signal?: AbortSignal;
};

export type ModelInfo = { id: string; label: string };

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  /** Proposé par défaut ; l'utilisateur choisit dans la liste réelle des modèles. */
  defaultModel: string;
  keyHelpUrl: string;
  /** false pour le fournisseur de démonstration. */
  needsKey?: boolean;
  streamText(req: GenerateRequest): AsyncIterable<string>;
  listModels(apiKey: string): Promise<ModelInfo[]>;
}
