import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";
import { evaluationSchema, extractJson, synthesisSchema } from "@/lib/engine/json";
import { ideaScore } from "@/lib/scoring";

describe("extractJson", () => {
  it("ignore le texte et les balises autour du JSON", () => {
    const text = 'Voici :\n```json\n{"summary":"ok","ideas":[{"title":"A","description":"d"}]}\n```';
    const parsed = synthesisSchema.parse(extractJson(text));
    expect(parsed.ideas[0]).toEqual({ title: "A", description: "d", authors: [] });
  });

  it("arrondit et accepte les notes envoyées en texte", () => {
    const parsed = evaluationSchema.parse({ ratings: [{ idea: "2", originalite: "4.4", faisabilite: 5, impact: 1, cout: 3 }] });
    expect(parsed.ratings[0]).toMatchObject({ idea: 2, originalite: 4, comment: "" });
  });

  it("refuse une note hors de l'échelle", () => {
    expect(() => evaluationSchema.parse({ ratings: [{ idea: 1, originalite: 9, faisabilite: 5, impact: 1, cout: 3 }] })).toThrow();
  });
});

describe("ideaScore", () => {
  const s = (n: number) => ({ originalite: n, faisabilite: n, impact: n, cout: n });
  it("donne autant de poids à l'utilisateur qu'à l'ensemble des IA", () => {
    const score = ideaScore([
      { seatId: "a", scores: s(2) },
      { seatId: "b", scores: s(4) },
      { seatId: null, scores: s(5) },
    ]);
    expect(score).toEqual({ ai: 3, user: 5, overall: 4 });
  });
  it("se contente des IA quand l'utilisateur n'a pas noté", () => {
    expect(ideaScore([{ seatId: "a", scores: s(2) }])).toEqual({ ai: 2, user: null, overall: 2 });
  });
});

describe("crypto", () => {
  const key = randomBytes(32).toString("base64");
  it("chiffre puis déchiffre une clé API", () => {
    const secret = "sk-test-1234567890";
    const payload = encrypt(secret, key);
    expect(payload).not.toContain(secret);
    expect(decrypt(payload, key)).toBe(secret);
  });
  it("échoue avec une autre clé maîtresse", () => {
    const payload = encrypt("secret", key);
    expect(() => decrypt(payload, randomBytes(32).toString("base64"))).toThrow();
  });
});
