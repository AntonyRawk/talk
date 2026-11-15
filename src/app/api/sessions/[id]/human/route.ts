import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { currentTurn, loadSession, markDoneIfFinished } from "@/lib/engine/run";
import { fail, handle, parseBody, type Params } from "@/lib/http";

const input = z.object({ content: z.string().trim().max(5000).default(""), skip: z.boolean().default(false) });

/** Enregistre la prise de parole (ou le « je passe ») de l'humain dont c'est le tour. */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const { content, skip } = await parseBody(req, input);
    const data = await loadSession(id);
    if (!data) return fail("Session introuvable.", 404);
    const turn = currentTurn(data);
    if (!turn?.isHuman) return fail("Ce n'est pas le tour d'un humain.", 409);
    if (!skip && !content) return fail("Écris quelque chose ou passe ton tour.");
    const db = await getDb();
    await db.insert(schema.messages).values({ sessionId: id, seatId: turn.seatId, phase: turn.phase, round: turn.round, content: skip ? "" : content, skipped: skip });
    await markDoneIfFinished(id);
    return NextResponse.json({ ok: true });
  });
}
