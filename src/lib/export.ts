import type { Loaded } from "./engine/run";
import { PHASE_LABELS } from "./engine/plan";
import { ideaScore } from "./scoring";

const fmt = (n: number | null) => (n === null ? "–" : n.toFixed(1));

/** Compte rendu complet d'une session en Markdown. */
export function sessionToMarkdown(data: Loaded): string {
  const seatName = new Map(data.seats.map((s) => [s.id, s.displayName]));
  const out = [`# ${data.session.topic}`, ""];
  if (data.session.context) out.push(`> ${data.session.context}`, "");
  out.push("## Participants", "");
  for (const s of data.seats) {
    out.push(s.isHuman ? `- ${s.displayName} (humain)` : `- ${s.displayName} : ${s.persona?.role || "participant"} · ${s.persona?.provider}/${s.persona?.model}`);
  }

  const ranked = data.ideas
    .map((idea) => ({ idea, score: ideaScore(data.ratings.filter((r) => r.ideaId === idea.id)) }))
    .sort((a, b) => (b.score.overall ?? 0) - (a.score.overall ?? 0));
  if (ranked.length) {
    out.push("", "## Classement des idées", "", "| # | Idée | Note IA | Ta note | Globale |", "|---|---|---|---|---|");
    ranked.forEach(({ idea, score }, i) => out.push(`| ${i + 1} | ${idea.title} | ${fmt(score.ai)} | ${fmt(score.user)} | ${fmt(score.overall)} |`));
    out.push("");
    for (const { idea } of ranked) out.push(`### ${idea.title}`, "", idea.description, "", `Porté par : ${idea.authors.join(", ") || "–"}`, "");
  }

  out.push("## Déroulé", "");
  let last = "";
  for (const m of data.messages) {
    const header = m.phase === "echange" ? `${PHASE_LABELS[m.phase]}, tour ${m.round}` : PHASE_LABELS[m.phase];
    if (header !== last) out.push(`### ${header}`, "");
    last = header;
    out.push(`**${seatName.get(m.seatId) ?? "?"}** : ${m.skipped ? "_a passé son tour_" : m.content}`, "");
  }
  return out.join("\n");
}
