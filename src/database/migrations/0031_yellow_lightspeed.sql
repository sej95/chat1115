ALTER TABLE "sessions" DROP CONSTRAINT "sessions_chat_group_id_chat_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "chat_group_id";