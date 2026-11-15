import type { Scores } from "./db/schema";

export const CRITERIA: { key: keyof Scores; label: string; hint: string }[] = [
  { key: "originalite", label: "Originalité", hint: "5 = très originale" },
  { key: "faisabilite", label: "Faisabilité", hint: "5 = facile à réaliser" },
  { key: "impact", label: "Impact", hint: "5 = impact très fort" },
  { key: "cout", label: "Coût", hint: "5 = peu coûteuse" },
];

export function average(scores: Scores): number {
  return CRITERIA.reduce((sum, c) => sum + scores[c.key], 0) / CRITERIA.length;
}

export type RatingLike = { seatId: string | null; scores: Scores };

/** Moyenne des IA, note de l'utilisateur et note globale (sur 5). */
export function ideaScore(ratings: RatingLike[]) {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const ai = mean(ratings.filter((r) => r.seatId !== null).map((r) => average(r.scores)));
  const user = mean(ratings.filter((r) => r.seatId === null).map((r) => average(r.scores)));
  // La note de l'utilisateur pèse autant que l'ensemble des IA.
  const overall = ai !== null && user !== null ? (ai + user) / 2 : (ai ?? user);
  return { ai, user, overall };
}
