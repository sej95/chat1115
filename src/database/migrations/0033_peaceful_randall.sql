ALTER TABLE "chat_groups" DROP CONSTRAINT "chat_groups_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "pinned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "chat_groups" DROP COLUMN "session_id";