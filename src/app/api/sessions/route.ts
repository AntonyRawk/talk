import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema, LOCAL_USER_ID } from "@/lib/db";
import type { Phase } from "@/lib/db/schema";
import { fail, handle, parseBody } from "@/lib/http";
import { sessionInput } from "@/lib/validation";

const { sessions, seats, personas } = schema;
const AI_PHASES: Phase[] = ["divergence", "echange", "evaluation"];

export function GET() {
  return handle(async () => {
    const db = await getDb();
    const rows = await db.select().from(sessions).where(eq(sessions.userId, LOCAL_USER_ID)).orderBy(desc(sessions.createdAt));
    return NextResponse.json(rows);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, sessionInput);
    const db = await getDb();
    const chosen = await db
      .select()
      .from(personas)
      .where(and(eq(personas.userId, LOCAL_USER_ID), inArray(personas.id, input.personaIds)));
    if (chosen.length !== input.personaIds.length) return fail("Une des personnalités choisies n'existe plus.");

    // Les sièges suivent l'ordre choisi ; deux IA avec le même nom sont numérotées.
    const ordered = input.personaIds.map((pid) => chosen.find((p) => p.id === pid)!);
    const used = new Map<string, number>();
    const uniqueName = (name: string) => {
      const n = (used.get(name) ?? 0) + 1;
      used.set(name, n);
      return n === 1 ? name : `${name} ${n}`;
    };

    const [session] = await db
      .insert(sessions)
      .values({ userId: LOCAL_USER_ID, topic: input.topic, context: input.context, rounds: input.rounds, turnOrder: input.turnOrder, maxWords: input.maxWords })
      .returning();

    const seatRows = await db
      .insert(seats)
      .values([
        ...ordered.map((p, position) => ({
          sessionId: session.id,
          position,
          displayName: uniqueName(p.name),
          persona: { name: p.name, provider: p.provider, model: p.model, role: p.role, traits: p.traits, style: p.style, instructions: p.instructions, color: p.color },
          phases: AI_PHASES,
        })),
        ...input.humans.map((h, i) => ({
          sessionId: session.id,
          position: ordered.length + i,
          isHuman: true,
          displayName: uniqueName(h.name),
          phases: h.phases.filter((ph) => ph === "divergence" || ph === "echange"),
        })),
      ])
      .returning();

    const facilitatorIndex = Math.max(0, input.personaIds.indexOf(input.facilitatorPersonaId ?? ""));
    const facilitator = seatRows.find((s) => !s.isHuman && s.position === facilitatorIndex);
    if (facilitator) await db.update(sessions).set({ facilitatorSeatId: facilitator.id }).where(eq(sessions.id, session.id));

    return NextResponse.json({ id: session.id }, { status: 201 });
  });
}
