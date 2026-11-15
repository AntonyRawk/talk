import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement des clés API (AES-256-GCM). La clé maîtresse vient de la
 * variable d'environnement TALK_ENCRYPTION_KEY (32 octets en base64) et ne
 * doit jamais être stockée dans la base.
 */
function masterKey(raw = process.env.TALK_ENCRYPTION_KEY): Buffer {
  if (!raw) {
    throw new Error("TALK_ENCRYPTION_KEY manquante. Lance `npm run setup` pour la générer.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TALK_ENCRYPTION_KEY doit faire 32 octets (base64).");
  return key;
}

export function encrypt(plain: string, raw?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(raw), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(payload: string, raw?: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Format chiffré inconnu.");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(raw), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
