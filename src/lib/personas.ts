import type { PersonaSnapshot, Traits } from "./db/schema";

export const TRAITS: { key: keyof Traits; label: string; levels: [string, string, string, string, string] }[] = [
  {
    key: "creativity",
    label: "Créativité",
    levels: [
      "Tu privilégies les idées sûres, éprouvées et réalistes.",
      "Tu proposes surtout des idées concrètes, avec parfois une touche d'originalité.",
      "Tu équilibres idées réalistes et idées originales.",
      "Tu aimes les idées originales et les angles inattendus.",
      "Tu proposes des idées audacieuses, surprenantes, quitte à sortir complètement du cadre.",
    ],
  },
  {
    key: "critique",
    label: "Esprit critique",
    levels: [
      "Tu es très bienveillant : tu construis sur les idées des autres sans les critiquer.",
      "Tu critiques rarement, et toujours avec douceur.",
      "Tu soulignes les forces et les faiblesses des idées de façon équilibrée.",
      "Tu examines les idées de près et pointes clairement leurs failles.",
      "Tu joues l'avocat du diable : tu remets en question chaque idée, y compris les plus populaires.",
    ],
  },
  {
    key: "sociability",
    label: "Sociabilité",
    levels: [
      "Tu es direct et factuel, sans formules de politesse.",
      "Tu restes sobre, centré sur le fond.",
      "Tu es cordial et tu réagis volontiers aux autres.",
      "Tu es chaleureux : tu interpelles les autres par leur nom et tu rebondis sur leurs propos.",
      "Tu es très expressif et enthousiaste ; tu fédères le groupe et encourages chacun.",
    ],
  },
  {
    key: "caution",
    label: "Prudence",
    levels: [
      "Tu prends des risques et tu minimises les obstacles.",
      "Tu mentionnes les risques seulement quand ils sont majeurs.",
      "Tu tiens compte des risques sans qu'ils te freinent.",
      "Tu soulignes souvent les risques, les coûts et les contraintes.",
      "Tu es très prudent : tu insistes sur les risques, les coûts, le juridique et la faisabilité.",
    ],
  },
];

export const DEFAULT_TRAITS: Traits = { creativity: 3, critique: 3, sociability: 3, caution: 3 };

function level(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value))) - 1;
}

/** Transforme une personnalité en instructions système pour le modèle. */
export function personaSystemPrompt(p: PersonaSnapshot, maxWords: number): string {
  const lines = [
    `Tu participes à une séance de brainstorm avec d'autres participants (des IA et parfois des humains).`,
    `Ton nom est ${p.name}.`,
  ];
  if (p.role.trim()) lines.push(`Ton rôle dans le groupe : ${p.role.trim()}.`);
  lines.push("", "Ta personnalité :");
  for (const t of TRAITS) lines.push(`- ${t.levels[level(p.traits[t.key])]}`);
  if (p.style.trim()) lines.push(`- Ton style d'expression : ${p.style.trim()}.`);
  if (p.instructions.trim()) lines.push("", p.instructions.trim());
  lines.push(
    "",
    "Règles :",
    "- Reste fidèle à ta personnalité du début à la fin.",
    "- Sois concret et apporte quelque chose de nouveau ; ne répète pas ce qui a déjà été dit.",
    `- Réponds en ${maxWords} mots maximum.`,
    "- Ne commence pas ta réponse par ton nom.",
    "- Réponds en français.",
  );
  return lines.join("\n");
}
