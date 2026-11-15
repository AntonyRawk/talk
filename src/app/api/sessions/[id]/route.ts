import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { currentTurn, loadSession } from "@/lib/engine/run";
import { fail, handle, type Params } from "@/lib/http";
import { ideaScore } from "@/lib/scoring";

export function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const data = await loadSession(id);
    if (!data) return fail("Session introuvable.", 404);
    const ideas = data.ideas
      .map((idea) => {
        const rs = data.ratings.filter((r) => r.ideaId === idea.id);
        return { ...idea, ratings: rs, score: ideaScore(rs) };
      })
      .sort((a, b) => (b.score.overall ?? 0) - (a.score.overall ?? 0));
    return NextResponse.json({ ...data, ideas, next: currentTurn(data) });
  });
}

export function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const data = await loadSession(id);
    if (!data) return fail("Session introuvable.", 404);
    const db = await getDb();
    const { ratings, ideas, messages, seats, sessions } = schema;
    await db.delete(ratings).where(eq(ratings.sessionId, id));
    await db.delete(ideas).where(eq(ideas.sessionId, id));
    await db.delete(messages).where(eq(messages.sessionId, id));
    await db.delete(seats).where(eq(seats.sessionId, id));
    await db.delete(sessions).where(eq(sessions.id, id));
    return NextResponse.json({ ok: true });
  });
}
