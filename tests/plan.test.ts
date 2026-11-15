import { describe, expect, it } from "vitest";
import { buildPlan, nextTurn, type PlanSeat } from "@/lib/engine/plan";

const seats: PlanSeat[] = [
  { id: "a", position: 0, isHuman: false, phases: ["divergence", "echange", "evaluation"] },
  { id: "b", position: 1, isHuman: false, phases: ["divergence", "echange", "evaluation"] },
  { id: "h", position: 2, isHuman: true, phases: ["echange"] },
];
const session = { id: "s1", rounds: 2, turnOrder: "round_robin" as const, facilitatorSeatId: "b" };

describe("buildPlan", () => {
  it("enchaîne idées, échanges, synthèse puis évaluation", () => {
    const plan = buildPlan(session, seats).map((t) => `${t.phase}:${t.round}:${t.seatId}`);
    expect(plan).toEqual([
      "divergence:0:a",
      "divergence:0:b",
      "echange:1:a",
      "echange:1:b",
      "echange:1:h",
      "echange:2:a",
      "echange:2:b",
      "echange:2:h",
      "synthese:0:b",
      "evaluation:0:a",
      "evaluation:0:b",
    ]);
  });

  it("garde un ordre aléatoire stable et complet pour chaque tour", () => {
    const random = { ...session, turnOrder: "random" as const };
    const first = buildPlan(random, seats);
    expect(buildPlan(random, seats)).toEqual(first);
    const round1 = first.filter((t) => t.phase === "echange" && t.round === 1).map((t) => t.seatId);
    expect([...round1].sort()).toEqual(["a", "b", "h"]);
  });

  it("prend le premier participant IA comme animateur par défaut", () => {
    const plan = buildPlan({ ...session, facilitatorSeatId: null }, seats);
    expect(plan.find((t) => t.phase === "synthese")?.seatId).toBe("a");
  });
});

describe("nextTurn", () => {
  it("renvoie le premier tour non joué, puis null à la fin", () => {
    const plan = buildPlan(session, seats);
    expect(nextTurn(session, seats, [])).toEqual(plan[0]);
    const played = plan.slice(0, 4);
    expect(nextTurn(session, seats, played)).toMatchObject({ phase: "echange", round: 1, seatId: "h", isHuman: true });
    expect(nextTurn(session, seats, plan)).toBeNull();
  });
});
