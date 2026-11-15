import { z } from "zod";

/** Extrait le premier objet JSON d'un texte (les modèles ajoutent parfois du texte ou des ```). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Aucun JSON trouvé dans la réponse.");
  return JSON.parse(text.slice(start, end + 1));
}

export const synthesisSchema = z.object({
  summary: z.string(),
  ideas: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string(),
        authors: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});
export type Synthesis = z.infer<typeof synthesisSchema>;

const score = z.coerce.number().min(1).max(5).transform(Math.round);
export const evaluationSchema = z.object({
  ratings: z.array(
    z.object({
      idea: z.coerce.number().int(),
      originalite: score,
      faisabilite: score,
      impact: score,
      cout: score,
      comment: z.string().default(""),
    }),
  ),
});
export type Evaluation = z.infer<typeof evaluationSchema>;
