import type { ProviderAdapter } from "./types";

/**
 * Fournisseur de démonstration : aucune clé, aucune facture. Il produit des
 * réponses fictives pour essayer l'application et pour les tests.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeReply(system: string, prompt: string, json: boolean): string {
  const name = /Ton nom est (.+?)\./.exec(system)?.[1] ?? "Démo";
  if (json && prompt.includes('"ratings"')) {
    const numbers = [...prompt.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
    return JSON.stringify({
      ratings: numbers.map((n) => ({
        idea: n,
        originalite: ((n + name.length) % 5) + 1,
        faisabilite: ((n * 2 + name.length) % 5) + 1,
        impact: ((n * 3) % 5) + 1,
        cout: ((n + 2) % 5) + 1,
        comment: `Avis de ${name} sur l'idée ${n}.`,
      })),
    });
  }
  if (json) {
    const names = /parmi : (.+)\./.exec(prompt)?.[1].split(", ") ?? [];
    return JSON.stringify({
      summary: "Le groupe a convergé vers des idées simples à tester rapidement, avec un débat sur les coûts.",
      ideas: ["Soirée thématique", "Programme de fidélité", "Partenariat local"].map((title, i) => ({
        title,
        description: `Description fictive de l'idée « ${title} ».`,
        authors: names.length ? [names[i % names.length]] : [],
      })),
    });
  }
  if (prompt.includes("Première étape")) {
    return `Voici mes premières idées, du point de vue de ${name} :\n1. Soirée thématique : un événement récurrent.\n2. Programme de fidélité : récompenser les habitués.\n3. Partenariat local : s'associer aux commerces voisins.`;
  }
  return `${name} ici. J'aime la piste du partenariat local, mais il faut chiffrer son coût. Je propose de la tester un mois avant de la généraliser.`;
}

export const demo: ProviderAdapter = {
  id: "demo",
  label: "Démo (sans clé, réponses fictives)",
  defaultModel: "demo",
  keyHelpUrl: "",
  needsKey: false,

  async *streamText({ system, prompt, json }) {
    const text = fakeReply(system, prompt, !!json);
    for (const word of text.split(/(?<= )/)) {
      await sleep(json ? 2 : 25);
      yield word;
    }
  },

  async listModels() {
    return [{ id: "demo", label: "Démo" }];
  },
};
