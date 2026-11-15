import type { Phase, PersonaSnapshot } from "../db/schema";
import { personaSystemPrompt } from "../personas";
import { CRITERIA } from "../scoring";

export type TranscriptEntry = { name: string; role: string; isHuman: boolean; phase: Phase; round: number; content: string };
export type SessionBrief = { topic: string; context: string; rounds: number; maxWords: number };

function brief(s: SessionBrief): string {
  return [`Sujet du brainstorm : ${s.topic}`, s.context.trim() ? `Contexte et contraintes : ${s.context.trim()}` : ""]
    .filter(Boolean)
    .join("\n");
}

export function formatTranscript(entries: TranscriptEntry[]): string {
  return entries
    .map((e) => {
      const who = e.isHuman ? `${e.name} (humain)` : e.role ? `${e.name} (${e.role})` : e.name;
      return `### ${who}\n${e.content.trim()}`;
    })
    .join("\n\n");
}

export function divergencePrompt(s: SessionBrief): string {
  return `${brief(s)}

Première étape : propose tes idées initiales (3 à 5), sans connaître celles des autres participants. Pour chaque idée, donne un titre court et une phrase d'explication.`;
}

export function exchangePrompt(s: SessionBrief, round: number, transcript: TranscriptEntry[]): string {
  return `${brief(s)}

Voici la discussion jusqu'ici :

${formatTranscript(transcript)}

C'est ton tour de parole (tour ${round} sur ${s.rounds}). Réagis aux idées des autres : construis dessus, critique-les, combine-les, ou propose une idée nouvelle qui manque. Adresse-toi aux autres par leur nom quand c'est utile.`;
}

export const FACILITATOR_SYSTEM = `Tu es l'animateur neutre d'une séance de brainstorm. Tu ne donnes pas ton avis : tu regroupes, clarifies et synthétises fidèlement les idées des participants. Tu réponds uniquement avec un objet JSON valide, sans texte autour. Rédige en français.`;

export function synthesisPrompt(s: SessionBrief, transcript: TranscriptEntry[], names: string[]): string {
  return `${brief(s)}

Voici toute la discussion :

${formatTranscript(transcript)}

Fais la synthèse. Regroupe les idées similaires, garde les meilleures versions issues des échanges, et produis entre 3 et 10 idées distinctes.
Pour chaque idée, indique dans "authors" le ou les participants qui l'ont surtout portée, parmi : ${names.join(", ")}.

Réponds uniquement avec ce JSON :
{"summary": "2 à 4 phrases sur ce qui ressort de la séance", "ideas": [{"title": "titre court", "description": "2 ou 3 phrases", "authors": ["Nom"]}]}`;
}

export function evaluationPrompt(s: SessionBrief, ideas: { number: number; title: string; description: string }[]): string {
  const criteria = CRITERIA.map((c) => `- ${c.key} : ${c.label} (${c.hint})`).join("\n");
  const list = ideas.map((i) => `${i.number}. ${i.title} : ${i.description}`).join("\n");
  return `${brief(s)}

Voici les idées retenues à la fin de la séance. Tu dois noter chacune d'elles de 1 à 5 sur ces critères, en restant fidèle à ta personnalité :
${criteria}

Idées :
${list}

Réponds uniquement avec ce JSON, sans texte autour :
{"ratings": [{"idea": 1, "originalite": 3, "faisabilite": 3, "impact": 3, "cout": 3, "comment": "une phrase qui justifie ta note"}]}`;
}

export function systemFor(persona: PersonaSnapshot, maxWords: number, phase: Phase): string {
  const base = personaSystemPrompt(persona, maxWords);
  return phase === "evaluation"
    ? `${base}\n\nPour cette étape, tu réponds uniquement avec un objet JSON valide.`
    : base;
}
