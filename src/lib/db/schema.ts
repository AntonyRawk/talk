import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Tant que l'authentification n'est pas en place, toutes les données
 * appartiennent à l'utilisateur local "local". La colonne userId est déjà là
 * pour que le passage aux comptes utilisateurs ne demande pas de migration
 * de structure.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

/** Clés API des fournisseurs (BYOK), toujours chiffrées. */
export const providerKeys = sqliteTable("provider_keys", {
  id: id(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  last4: text("last4").notNull(),
  createdAt: createdAt(),
});

export type Traits = {
  creativity: number;
  critique: number;
  sociability: number;
  caution: number;
};

/** Une personnalité réutilisable : un modèle d'IA + un caractère. */
export const personas = sqliteTable("personas", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  role: text("role").notNull().default(""),
  traits: text("traits", { mode: "json" }).$type<Traits>().notNull(),
  style: text("style").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id").notNull(),
  topic: text("topic").notNull(),
  context: text("context").notNull().default(""),
  rounds: integer("rounds").notNull().default(2),
  turnOrder: text("turn_order").$type<"round_robin" | "random">().notNull().default("round_robin"),
  maxWords: integer("max_words").notNull().default(150),
  facilitatorSeatId: text("facilitator_seat_id"),
  status: text("status").$type<"running" | "done">().notNull().default("running"),
  createdAt: createdAt(),
});

export type Phase = "divergence" | "echange" | "synthese" | "evaluation";

/**
 * Un siège à la table. Un siège IA pointe vers une personnalité (copiée au
 * moment de la création, pour que modifier la personnalité ne change pas les
 * sessions passées). Un siège humain n'a pas de personnalité.
 */
export const seats = sqliteTable("seats", {
  id: id(),
  sessionId: text("session_id").notNull(),
  position: integer("position").notNull(),
  isHuman: integer("is_human", { mode: "boolean" }).notNull().default(false),
  displayName: text("display_name").notNull(),
  persona: text("persona", { mode: "json" }).$type<PersonaSnapshot | null>(),
  phases: text("phases", { mode: "json" }).$type<Phase[]>().notNull(),
});

export type PersonaSnapshot = {
  name: string;
  provider: string;
  model: string;
  role: string;
  traits: Traits;
  style: string;
  instructions: string;
  color: string;
};

export const messages = sqliteTable("messages", {
  id: id(),
  sessionId: text("session_id").notNull(),
  seatId: text("seat_id").notNull(),
  phase: text("phase").$type<Phase>().notNull(),
  round: integer("round").notNull(),
  content: text("content").notNull(),
  skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const ideas = sqliteTable("ideas", {
  id: id(),
  sessionId: text("session_id").notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  authors: text("authors", { mode: "json" }).$type<string[]>().notNull(),
});

export type Scores = {
  originalite: number;
  faisabilite: number;
  impact: number;
  cout: number;
};

/** Une note : par un siège IA (seatId) ou par l'utilisateur (seatId null). */
export const ratings = sqliteTable("ratings", {
  id: id(),
  ideaId: text("idea_id").notNull(),
  sessionId: text("session_id").notNull(),
  seatId: text("seat_id"),
  scores: text("scores", { mode: "json" }).$type<Scores>().notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: createdAt(),
});
