DO $$ BEGIN
 CREATE TYPE "public"."channel_type" AS ENUM('text', 'voice');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."story_audience" AS ENUM('public', 'close_friends');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_congrats" (
	"milestone_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_congrats_milestone_id_user_id_pk" PRIMARY KEY("milestone_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "close_friends" (
	"user_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "close_friends_user_id_friend_id_pk" PRIMARY KEY("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"media_url" text NOT NULL,
	"caption" text,
	"audience" "story_audience" DEFAULT 'public' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_views" (
	"story_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_views_story_id_viewer_id_pk" PRIMARY KEY("story_id","viewer_id")
);
--> statement-breakpoint
ALTER TABLE "career_milestones" ADD COLUMN "congrats_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "parent_message_id" uuid;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "community_channels" ADD COLUMN "type" "channel_type" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_channels" ADD COLUMN "write_min_role" "member_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_channels" ADD COLUMN "slow_mode_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "disappearing_seconds" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "view_once" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_reel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_text" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_emoji" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_updated_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "career_congrats" ADD CONSTRAINT "career_congrats_milestone_id_career_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."career_milestones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "career_congrats" ADD CONSTRAINT "career_congrats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "close_friends" ADD CONSTRAINT "close_friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "close_friends" ADD CONSTRAINT "close_friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_close_friends_friend" ON "close_friends" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_author" ON "stories" USING btree ("author_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_university" ON "stories" USING btree ("university_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_messages_parent" ON "channel_messages" USING btree ("parent_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_reels" ON "posts" USING btree ("university_id","is_reel","created_at");