import type { Phase } from "../db/schema";

export type PlanSeat = { id: string; position: number; isHuman: boolean; phases: Phase[] };
export type PlanSession = { id: string; rounds: number; turnOrder: "round_robin" | "random"; facilitatorSeatId: string | null };
export type PlanMessage = { seatId: string; phase: Phase; round: number };

export type Turn = { phase: Phase; round: number; seatId: string; isHuman: boolean };

export const PHASE_LABELS: Record<Phase, string> = {
  divergence: "Idées individuelles",
  echange: "Échanges",
  synthese: "Synthèse",
  evaluation: "Évaluation",
};

/** Mélange déterministe : le même tour garde toujours le même ordre. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function facilitatorOf(session: PlanSession, seats: PlanSeat[]): PlanSeat | undefined {
  const ai = seats.filter((s) => !s.isHuman).sort((a, b) => a.position - b.position);
  return ai.find((s) => s.id === session.facilitatorSeatId) ?? ai[0];
}

/**
 * Liste complète des tours d'une session, dans l'ordre.
 * - divergence : chaque participant propose ses idées sans voir les autres ;
 * - échanges : N tours de table où chacun réagit ;
 * - synthèse : l'animateur regroupe les idées ;
 * - évaluation : chaque IA note les idées (les humains notent dans l'interface).
 */
export function buildPlan(session: PlanSession, seats: PlanSeat[]): Turn[] {
  const ordered = [...seats].sort((a, b) => a.position - b.position);
  const turns: Turn[] = [];
  const take = (phase: Phase, round: number, list: PlanSeat[]) => {
    for (const s of list) {
      if (s.phases.includes(phase)) turns.push({ phase, round, seatId: s.id, isHuman: s.isHuman });
    }
  };

  take("divergence", 0, ordered);
  for (let r = 1; r <= session.rounds; r++) {
    take("echange", r, session.turnOrder === "random" ? seededShuffle(ordered, `${session.id}:${r}`) : ordered);
  }
  const facilitator = facilitatorOf(session, seats);
  if (facilitator) turns.push({ phase: "synthese", round: 0, seatId: facilitator.id, isHuman: false });
  take("evaluation", 0, ordered.filter((s) => !s.isHuman));
  return turns;
}

/** Le prochain tour à jouer, ou null si la session est terminée. */
export function nextTurn(session: PlanSession, seats: PlanSeat[], done: PlanMessage[]): Turn | null {
  const played = new Set(done.map((m) => `${m.phase}:${m.round}:${m.seatId}`));
  return buildPlan(session, seats).find((t) => !played.has(`${t.phase}:${t.round}:${t.seatId}`)) ?? null;
}
