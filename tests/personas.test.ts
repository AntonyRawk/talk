import { describe, expect, it } from "vitest";
import { personaSystemPrompt, TRAITS } from "@/lib/personas";

const persona = {
  name: "Claude",
  provider: "anthropic",
  model: "claude-opus-5-5",
  role: "le pragmatique",
  traits: { creativity: 1, critique: 5, sociability: 3, caution: 4 },
  style: "clair et structuré",
  instructions: "Tu connais bien la restauration.",
  color: "#000000",
};

describe("personaSystemPrompt", () => {
  it("traduit chaque curseur en consigne", () => {
    const prompt = personaSystemPrompt(persona, 120);
    expect(prompt).toContain("Ton nom est Claude.");
    expect(prompt).toContain("le pragmatique");
    expect(prompt).toContain(TRAITS[0].levels[0]);
    expect(prompt).toContain(TRAITS[1].levels[4]);
    expect(prompt).toContain("clair et structuré");
    expect(prompt).toContain("Tu connais bien la restauration.");
    expect(prompt).toContain("120 mots maximum");
  });

  it("borne les valeurs hors de l'échelle 1 à 5", () => {
    const prompt = personaSystemPrompt({ ...persona, traits: { creativity: 9, critique: 0, sociability: 3, caution: 3 } }, 100);
    expect(prompt).toContain(TRAITS[0].levels[4]);
    expect(prompt).toContain(TRAITS[1].levels[0]);
  });
});
