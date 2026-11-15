CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`authors` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`seat_id` text NOT NULL,
	`phase` text NOT NULL,
	`round` integer NOT NULL,
	`content` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`traits` text NOT NULL,
	`style` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`last4` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`session_id` text NOT NULL,
	`seat_id` text,
	`scores` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`is_human` integer DEFAULT false NOT NULL,
	`display_name` text NOT NULL,
	`persona` text,
	`phases` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`topic` text NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	`rounds` integer DEFAULT 2 NOT NULL,
	`turn_order` text DEFAULT 'round_robin' NOT NULL,
	`max_words` integer DEFAULT 150 NOT NULL,
	`facilitator_seat_id` text,
	`status` text DEFAULT 'running' NOT NULL,
	`created_at` integer NOT NULL
);
