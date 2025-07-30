ALTER TABLE "chat_groups" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_groups" DROP COLUMN "avatar";--> statement-breakpoint
ALTER TABLE "chat_groups" DROP COLUMN "background_color";