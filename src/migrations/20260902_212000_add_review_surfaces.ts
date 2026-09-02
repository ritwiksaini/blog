import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_theses_reviews_decision" AS ENUM('approved', 'blocked');
  CREATE TYPE "public"."enum_exemplar_candidates_domain" AS ENUM('vc', 'pe', 'macro');
  CREATE TYPE "public"."enum_exemplar_candidates_kind" AS ENUM('thesis', 'market-map', 'case-study', 'annual-letter', 'diligence-memo', 'regime-read');
  CREATE TYPE "public"."enum_exemplar_candidates_status" AS ENUM('proposed', 'approved', 'declined', 'unreachable', 'done');
  CREATE TABLE "theses_reviews" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stage" numeric NOT NULL,
  	"decision" "enum_theses_reviews_decision" NOT NULL,
  	"note" varchar,
  	"decided_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "exemplar_candidates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"publisher" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"why" varchar,
  	"decline_reason" varchar,
  	"teardown_path" varchar,
  	"domain" "enum_exemplar_candidates_domain" NOT NULL,
  	"kind" "enum_exemplar_candidates_kind",
  	"industries" varchar,
  	"status" "enum_exemplar_candidates_status" DEFAULT 'proposed' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "theses_artifacts" ADD COLUMN "content" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "exemplar_candidates_id" integer;
  ALTER TABLE "theses_reviews" ADD CONSTRAINT "theses_reviews_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "theses_reviews_order_idx" ON "theses_reviews" USING btree ("_order");
  CREATE INDEX "theses_reviews_parent_id_idx" ON "theses_reviews" USING btree ("_parent_id");
  CREATE INDEX "exemplar_candidates_domain_idx" ON "exemplar_candidates" USING btree ("domain");
  CREATE INDEX "exemplar_candidates_status_idx" ON "exemplar_candidates" USING btree ("status");
  CREATE INDEX "exemplar_candidates_updated_at_idx" ON "exemplar_candidates" USING btree ("updated_at");
  CREATE INDEX "exemplar_candidates_created_at_idx" ON "exemplar_candidates" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exemplar_candidates_fk" FOREIGN KEY ("exemplar_candidates_id") REFERENCES "public"."exemplar_candidates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_exemplar_candidates_id_idx" ON "payload_locked_documents_rels" USING btree ("exemplar_candidates_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "theses_reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "exemplar_candidates" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "theses_reviews" CASCADE;
  DROP TABLE "exemplar_candidates" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_exemplar_candidates_fk";
  
  DROP INDEX "payload_locked_documents_rels_exemplar_candidates_id_idx";
  ALTER TABLE "theses_artifacts" DROP COLUMN "content";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "exemplar_candidates_id";
  DROP TYPE "public"."enum_theses_reviews_decision";
  DROP TYPE "public"."enum_exemplar_candidates_domain";
  DROP TYPE "public"."enum_exemplar_candidates_kind";
  DROP TYPE "public"."enum_exemplar_candidates_status";`)
}
