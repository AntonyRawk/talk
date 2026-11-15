import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema, LOCAL_USER_ID } from "@/lib/db";
import { fail, handle, parseBody, type Params } from "@/lib/http";
import { personaInput } from "@/lib/validation";

const mine = (id: string) => and(eq(schema.personas.id, id), eq(schema.personas.userId, LOCAL_USER_ID));

export function PUT(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const input = await parseBody(req, personaInput);
    const db = await getDb();
    const [row] = await db.update(schema.personas).set(input).where(mine(id)).returning();
    return row ? NextResponse.json(row) : fail("Personnalité introuvable.", 404);
  });
}

export function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const db = await getDb();
    await db.delete(schema.personas).where(mine(id));
    return NextResponse.json({ ok: true });
  });
}
