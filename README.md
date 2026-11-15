# Talk

Talk réunit plusieurs IA (Claude, ChatGPT, Gemini…) autour d'une même table pour un brainstorm. Chaque IA reçoit une personnalité (pragmatique, sociable, avocat du diable…), les idées sont discutées, synthétisées puis notées. Un humain peut prendre place à la table.

## Déroulement d'une session

1. **Idées individuelles** : chaque participant propose ses idées sans voir celles des autres.
2. **Échanges** : plusieurs tours de table où chacun réagit aux autres.
3. **Synthèse** : une IA animatrice regroupe les idées et note qui les a portées.
4. **Évaluation** : chaque IA note les idées des autres (jamais les siennes) sur l'originalité, la faisabilité, l'impact et le coût. L'utilisateur ajoute sa note ; elle pèse autant que l'ensemble des IA.

## Démarrer en local

Il faut Node.js 22 ou plus récent.

```bash
npm install
npm run setup   # crée .env.local avec la clé de chiffrement
npm run dev
```

Ouvre ensuite http://localhost:3000. Le fournisseur **Démo** fonctionne sans clé : il donne des réponses fictives pour essayer l'application gratuitement.

## Clés API

Chaque utilisateur apporte ses propres clés (BYOK) dans la page **Clés API**. Une clé est vérifiée auprès du fournisseur, puis chiffrée en AES-256-GCM avec `TALK_ENCRYPTION_KEY` avant d'être enregistrée. Elle n'est jamais renvoyée au navigateur.

- Claude : https://console.anthropic.com/settings/keys
- OpenAI : https://platform.openai.com/api-keys
- Gemini : https://aistudio.google.com/apikey

## Architecture

- **Next.js 16 + TypeScript**. Les écrans appellent une API JSON (`src/app/api`), que l'app mobile pourra réutiliser.
- **Base de données** : SQLite via Drizzle ORM (`src/lib/db`). Les migrations sont dans `drizzle/` et s'appliquent au démarrage.
- **Fournisseurs** : un connecteur par IA dans `src/lib/providers`, avec la même interface (réponse en direct + liste des modèles).
- **Moteur de session** : `src/lib/engine`. `plan.ts` calcule l'ordre des tours, `prompts.ts` rédige les consignes, `run.ts` joue un tour et l'enregistre.
- **Personnalités** : `src/lib/personas.ts` transforme les curseurs (créativité, esprit critique, sociabilité, prudence) en instructions.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance l'app en développement |
| `npm test` | Tests unitaires |
| `npm run lint` / `npm run typecheck` | Vérifications du code |
| `npm run db:generate` | Crée une migration après un changement de `schema.ts` |

## Prochaines étapes

- Comptes utilisateurs (connexion par courriel ou Google) : pour l'instant, toutes les données appartiennent à un utilisateur local.
- Abonnements Stripe et crédits Talk.
- Plusieurs humains en direct dans la même session.
- Méthodes de brainstorm (six chapeaux, SCAMPER) et pondération des critères.
