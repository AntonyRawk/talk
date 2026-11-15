import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await req.json());
}

/** Transforme les erreurs connues en réponses JSON lisibles. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof ZodError) return fail(err.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; "));
    console.error(err);
    return fail(err instanceof Error ? err.message : "Erreur inattendue.", 500);
  });
}

export type Params = { params: Promise<{ id: string }> };
