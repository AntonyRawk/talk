import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { getDb, schema, LOCAL_USER_ID } from "@/lib/db";
import { fail, handle } from "@/lib/http";
import { getProvider, isProviderId } from "@/lib/providers";

/** Modèles réellement disponibles avec la clé de l'utilisateur. */
export function GET(req: Request) {
  return handle(async () => {
    const provider = new URL(req.url).searchParams.get("provider");
    if (!isProviderId(provider)) return fail("Fournisseur inconnu.");
    if (getProvider(provider).needsKey === false) return NextResponse.json(await getProvider(provider).listModels(""));
    const db = await getDb();
    const row = await db.query.providerKeys.findFirst({
      where: and(eq(schema.providerKeys.userId, LOCAL_USER_ID), eq(schema.providerKeys.provider, provider)),
    });
    if (!row) return NextResponse.json([]);
    return NextResponse.json(await getProvider(provider).listModels(decrypt(row.encryptedKey)));
  });
}
