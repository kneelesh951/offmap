DO $$ BEGIN
 CREATE TYPE "public"."revenue_event_type" AS ENUM('subscription_charge', 'subscription_refund', 'booking_charge', 'booking_refund', 'platform_fee', 'host_payout', 'stripe_fee');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "revenue_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "revenue_event_type" NOT NULL,
	"user_id" uuid,
	"host_id" uuid,
	"city_id" uuid,
	"country_code" text,
	"booking_id" uuid,
	"subscription_id" uuid,
	"stripe_event_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_events_occurred_idx" ON "revenue_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_events_type_occurred_idx" ON "revenue_events" USING btree ("type","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_events_city_occurred_idx" ON "revenue_events" USING btree ("city_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_events_host_occurred_idx" ON "revenue_events" USING btree ("host_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "revenue_events_stripe_event_idx" ON "revenue_events" USING btree ("stripe_event_id");