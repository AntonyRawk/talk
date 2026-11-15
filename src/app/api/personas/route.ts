import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema, LOCAL_USER_ID } from "@/lib/db";
import { handle, parseBody } from "@/lib/http";
import { personaInput } from "@/lib/validation";

export function GET() {
  return handle(async () => {
    const db = await getDb();
    const rows = await db.select().from(schema.personas).where(eq(schema.personas.userId, LOCAL_USER_ID)).orderBy(desc(schema.personas.createdAt));
    return NextResponse.json(rows);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, personaInput);
    const db = await getDb();
    const [row] = await db.insert(schema.personas).values({ ...input, userId: LOCAL_USER_ID }).returning();
    return NextResponse.json(row, { status: 201 });
  });
}
