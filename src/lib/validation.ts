import { z } from "zod";
import { PROVIDER_IDS } from "./providers";

const trait = z.coerce.number().int().min(1).max(5);

export const personaInput = z.object({
  name: z.string().trim().min(1).max(40),
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  model: z.string().trim().min(1),
  role: z.string().trim().max(120).default(""),
  traits: z.object({ creativity: trait, critique: trait, sociability: trait, caution: trait }),
  style: z.string().trim().max(200).default(""),
  instructions: z.string().trim().max(2000).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

const phase = z.enum(["divergence", "echange", "synthese", "evaluation"]);

export const sessionInput = z.object({
  topic: z.string().trim().min(3).max(500),
  context: z.string().trim().max(4000).default(""),
  rounds: z.coerce.number().int().min(0).max(6).default(2),
  turnOrder: z.enum(["round_robin", "random"]).default("round_robin"),
  maxWords: z.coerce.number().int().min(30).max(600).default(150),
  personaIds: z.array(z.string()).min(1, "Choisis au moins une personnalité."),
  facilitatorPersonaId: z.string().optional(),
  humans: z
    .array(z.object({ name: z.string().trim().min(1).max(40), phases: z.array(phase).min(1) }))
    .default([]),
});
