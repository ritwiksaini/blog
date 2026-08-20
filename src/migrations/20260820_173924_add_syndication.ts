import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_syndication_metrics_bucket" AS ENUM('48h', '7d', '30d');
  CREATE TYPE "public"."enum_syndication_platform" AS ENUM('linkedin');
  CREATE TYPE "public"."enum_syndication_status" AS ENUM('queued', 'drafted', 'posted', 'skipped');
  CREATE TYPE "public"."enum_syndication_link_placement" AS ENUM('first-comment', 'in-post');
  CREATE TABLE "syndication_metrics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"bucket" "enum_syndication_metrics_bucket" NOT NULL,
  	"captured_at" timestamp(3) with time zone NOT NULL,
  	"impressions" numeric,
  	"reactions" numeric,
  	"comments" numeric,
  	"reposts" numeric,
  	"link_clicks" numeric
  );
  
  CREATE TABLE "syndication" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"post_id" integer NOT NULL,
  	"platform" "enum_syndication_platform" DEFAULT 'linkedin' NOT NULL,
  	"status" "enum_syndication_status" DEFAULT 'queued' NOT NULL,
  	"body" varchar,
  	"link_comment" varchar,
  	"link_placement" "enum_syndication_link_placement" DEFAULT 'first-comment',
  	"posted_at" timestamp(3) with time zone,
  	"post_url" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "syndication_id" integer;
  ALTER TABLE "syndication_metrics" ADD CONSTRAINT "syndication_metrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."syndication"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "syndication" ADD CONSTRAINT "syndication_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "syndication_metrics_order_idx" ON "syndication_metrics" USING btree ("_order");
  CREATE INDEX "syndication_metrics_parent_id_idx" ON "syndication_metrics" USING btree ("_parent_id");
  CREATE INDEX "syndication_post_idx" ON "syndication" USING btree ("post_id");
  CREATE INDEX "syndication_platform_idx" ON "syndication" USING btree ("platform");
  CREATE INDEX "syndication_status_idx" ON "syndication" USING btree ("status");
  CREATE INDEX "syndication_updated_at_idx" ON "syndication" USING btree ("updated_at");
  CREATE INDEX "syndication_created_at_idx" ON "syndication" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_syndication_fk" FOREIGN KEY ("syndication_id") REFERENCES "public"."syndication"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_syndication_id_idx" ON "payload_locked_documents_rels" USING btree ("syndication_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "syndication_metrics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "syndication" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "syndication_metrics" CASCADE;
  DROP TABLE "syndication" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_syndication_fk";
  
  DROP INDEX "payload_locked_documents_rels_syndication_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "syndication_id";
  DROP TYPE "public"."enum_syndication_metrics_bucket";
  DROP TYPE "public"."enum_syndication_platform";
  DROP TYPE "public"."enum_syndication_status";
  DROP TYPE "public"."enum_syndication_link_placement";`)
}
