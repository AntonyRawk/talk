// Crée .env.local avec une clé de chiffrement si le fichier n'existe pas encore.
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (existsSync(".env.local")) {
  console.log(".env.local existe déjà, rien à faire.");
} else {
  const key = randomBytes(32).toString("base64");
  writeFileSync(
    ".env.local",
    `# Clé qui chiffre les clés API dans la base. Ne la partage pas et ne la perds pas.\nTALK_ENCRYPTION_KEY=${key}\nDATABASE_URL=file:./data/talk.db\n`,
  );
  console.log(".env.local créé avec une nouvelle clé de chiffrement.");
}
