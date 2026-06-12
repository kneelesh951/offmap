DO $$ BEGIN
 CREATE TYPE "public"."booking_status" AS ENUM('pending', 'accepted', 'declined', 'completed', 'cancelled', 'disputed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."cancellation_type" AS ENUM('traveler', 'host', 'extenuating', 'no_show_host', 'no_show_traveler', 'auto_declined');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveler_id" uuid NOT NULL,
	"host_id" uuid NOT NULL,
	"conversation_id" uuid,
	"session_date" timestamp with time zone,
	"duration_hours" integer DEFAULT 1 NOT NULL,
	"note_from_traveler" text,
	"session_rate_cents" integer NOT NULL,
	"service_fee_percent" integer DEFAULT 5 NOT NULL,
	"platform_commission_percent" integer DEFAULT 15 NOT NULL,
	"traveler_total_cents" integer NOT NULL,
	"host_payout_cents" integer NOT NULL,
	"platform_fee_cents" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancellation_type" "cancellation_type",
	"cancellation_reason" text,
	"refund_percent" integer,
	"refund_amount_cents" integer,
	"platform_credit_cents" integer DEFAULT 0,
	"no_show_reported_at" timestamp with time zone,
	"no_show_reported_by" uuid,
	"dispute_resolved_at" timestamp with time zone,
	"dispute_resolved_by" uuid,
	"dispute_notes" text,
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"original_session_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "cancellation_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "no_show_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "strike_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "strikes_reset_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "payout_frozen_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "id_document_url" text;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "id_document_type" text;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "id_verification_status" text DEFAULT 'not_submitted';--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "id_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "id_rejection_reason" text;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD COLUMN "intro_video_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "languages" text[] DEFAULT ;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "interests" text[] DEFAULT ;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "travel_style" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_completeness" integer DEFAULT 0;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_traveler_id_users_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_show_reported_by_users_id_fk" FOREIGN KEY ("no_show_reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dispute_resolved_by_users_id_fk" FOREIGN KEY ("dispute_resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_traveler_idx" ON "bookings" USING btree ("traveler_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_host_idx" ON "bookings" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" USING btree ("status");