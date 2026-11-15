import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { encrypt } from "@/lib/crypto";
import { getDb, schema, LOCAL_USER_ID } from "@/lib/db";
import { handle, parseBody } from "@/lib/http";
import { PROVIDER_IDS, PROVIDERS } from "@/lib/providers";

const { providerKeys } = schema;

/** Liste des fournisseurs et de leur clé (seulement les 4 derniers caractères). */
export function GET() {
  return handle(async () => {
    const db = await getDb();
    const rows = await db.select().from(providerKeys).where(eq(providerKeys.userId, LOCAL_USER_ID));
    return NextResponse.json(
      PROVIDER_IDS.map((id) => {
        const row = rows.find((r) => r.provider === id);
        const p = PROVIDERS[id];
        const needsKey = p.needsKey !== false;
        return { id, label: p.label, defaultModel: p.defaultModel, keyHelpUrl: p.keyHelpUrl, needsKey, configured: !needsKey || !!row, last4: row?.last4 ?? null };
      }),
    );
  });
}

const saveSchema = z.object({ provider: z.enum(PROVIDER_IDS as [string, ...string[]]), apiKey: z.string().trim().min(10) });

export function POST(req: Request) {
  return handle(async () => {
    const { provider, apiKey } = await parseBody(req, saveSchema);
    // On vérifie la clé auprès du fournisseur avant de l'enregistrer.
    try {
      await PROVIDERS[provider as keyof typeof PROVIDERS].listModels(apiKey);
    } catch {
      return NextResponse.json({ error: "Le fournisseur a refusé cette clé. Vérifie-la et réessaie." }, { status: 400 });
    }
    const db = await getDb();
    await db.delete(providerKeys).where(and(eq(providerKeys.userId, LOCAL_USER_ID), eq(providerKeys.provider, provider)));
    await db.insert(providerKeys).values({ userId: LOCAL_USER_ID, provider, encryptedKey: encrypt(apiKey), last4: apiKey.slice(-4) });
    return NextResponse.json({ ok: true });
  });
}

export function DELETE(req: Request) {
  return handle(async () => {
    const provider = new URL(req.url).searchParams.get("provider") ?? "";
    const db = await getDb();
    await db.delete(providerKeys).where(and(eq(providerKeys.userId, LOCAL_USER_ID), eq(providerKeys.provider, provider)));
    return NextResponse.json({ ok: true });
  });
}
