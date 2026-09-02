import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_theses_geography" AS ENUM('global', 'india', 'united-states');
  CREATE TYPE "public"."enum_theses_asset_class" AS ENUM('private-equity', 'venture-capital', 'cross');
  CREATE TYPE "public"."enum_theses_status" AS ENUM('proposed', 'active', 'published', 'dropped');
  CREATE TYPE "public"."enum_theses_stage_status" AS ENUM('ready', 'awaiting-review', 'blocked', 'done');
  CREATE TYPE "public"."enum_theses_proposed_by" AS ENUM('human', 'routine');
  CREATE TABLE "theses_artifacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stage" numeric NOT NULL,
  	"path" varchar NOT NULL,
  	"summary" varchar
  );
  
  CREATE TABLE "theses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"topic" varchar NOT NULL,
  	"brief" varchar,
  	"why_now" varchar,
  	"geography" "enum_theses_geography",
  	"asset_class" "enum_theses_asset_class",
  	"sector_id" integer,
  	"target_month" varchar,
  	"status" "enum_theses_status" DEFAULT 'proposed' NOT NULL,
  	"stage" numeric DEFAULT 1 NOT NULL,
  	"stage_status" "enum_theses_stage_status" DEFAULT 'ready' NOT NULL,
  	"stage_entered_at" timestamp(3) with time zone,
  	"proposed_by" "enum_theses_proposed_by" DEFAULT 'human',
  	"linked_post_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "theses_id" integer;
  ALTER TABLE "theses_artifacts" ADD CONSTRAINT "theses_artifacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "theses" ADD CONSTRAINT "theses_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "theses" ADD CONSTRAINT "theses_linked_post_id_posts_id_fk" FOREIGN KEY ("linked_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "theses_artifacts_order_idx" ON "theses_artifacts" USING btree ("_order");
  CREATE INDEX "theses_artifacts_parent_id_idx" ON "theses_artifacts" USING btree ("_parent_id");
  CREATE INDEX "theses_sector_idx" ON "theses" USING btree ("sector_id");
  CREATE INDEX "theses_status_idx" ON "theses" USING btree ("status");
  CREATE INDEX "theses_stage_status_idx" ON "theses" USING btree ("stage_status");
  CREATE INDEX "theses_linked_post_idx" ON "theses" USING btree ("linked_post_id");
  CREATE INDEX "theses_updated_at_idx" ON "theses" USING btree ("updated_at");
  CREATE INDEX "theses_created_at_idx" ON "theses" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_theses_fk" FOREIGN KEY ("theses_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_theses_id_idx" ON "payload_locked_documents_rels" USING btree ("theses_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "theses_artifacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "theses" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "theses_artifacts" CASCADE;
  DROP TABLE "theses" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_theses_fk";
  
  DROP INDEX "payload_locked_documents_rels_theses_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "theses_id";
  DROP TYPE "public"."enum_theses_geography";
  DROP TYPE "public"."enum_theses_asset_class";
  DROP TYPE "public"."enum_theses_status";
  DROP TYPE "public"."enum_theses_stage_status";
  DROP TYPE "public"."enum_theses_proposed_by";`)
}
