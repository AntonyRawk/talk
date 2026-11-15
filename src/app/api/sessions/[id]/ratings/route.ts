import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { loadSession } from "@/lib/engine/run";
import { fail, handle, parseBody, type Params } from "@/lib/http";

const score = z.coerce.number().int().min(1).max(5);
const input = z.object({
  ideaId: z.string(),
  scores: z.object({ originalite: score, faisabilite: score, impact: score, cout: score }),
  comment: z.string().trim().max(1000).default(""),
});

/** Note de l'utilisateur sur une idée (remplace sa note précédente). */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const { ideaId, scores, comment } = await parseBody(req, input);
    const data = await loadSession(id);
    if (!data) return fail("Session introuvable.", 404);
    if (!data.ideas.some((i) => i.id === ideaId)) return fail("Idée introuvable.", 404);
    const db = await getDb();
    const { ratings } = schema;
    await db.delete(ratings).where(and(eq(ratings.ideaId, ideaId), isNull(ratings.seatId)));
    await db.insert(ratings).values({ ideaId, sessionId: id, seatId: null, scores, comment });
    return NextResponse.json({ ok: true });
  });
}
