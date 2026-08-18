import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'bot');
  CREATE TYPE "public"."enum_posts_asset_class" AS ENUM('private-equity', 'venture-capital', 'cross');
  CREATE TYPE "public"."enum__posts_v_version_asset_class" AS ENUM('private-equity', 'venture-capital', 'cross');
  CREATE TYPE "public"."enum_pitches_geography" AS ENUM('global', 'india', 'united-states');
  CREATE TYPE "public"."enum_pitches_asset_class" AS ENUM('private-equity', 'venture-capital', 'cross');
  CREATE TYPE "public"."enum_pitches_post_format" AS ENUM('sharp-take', 'thesis');
  CREATE TYPE "public"."enum_pitches_status" AS ENUM('proposed', 'selected', 'drafted', 'rejected');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "posts_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"publisher" varchar,
  	"date_accessed" timestamp(3) with time zone
  );
  
  CREATE TABLE "_posts_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"publisher" varchar,
  	"date_accessed" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "sectors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pitches_research_paths" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "pitches_candidate_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"publisher" varchar,
  	"date_accessed" timestamp(3) with time zone
  );
  
  CREATE TABLE "pitches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"angle" varchar NOT NULL,
  	"why_now" varchar NOT NULL,
  	"geography" "enum_pitches_geography" NOT NULL,
  	"asset_class" "enum_pitches_asset_class" NOT NULL,
  	"suggested_sector_id" integer,
  	"suggested_sector_name" varchar,
  	"post_format" "enum_pitches_post_format" DEFAULT 'sharp-take' NOT NULL,
  	"status" "enum_pitches_status" DEFAULT 'proposed' NOT NULL,
  	"linked_post_id" integer,
  	"drafted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
  ALTER TABLE "posts" ADD COLUMN "asset_class" "enum_posts_asset_class";
  ALTER TABLE "posts" ADD COLUMN "sector_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_asset_class" "enum__posts_v_version_asset_class";
  ALTER TABLE "_posts_v" ADD COLUMN "version_sector_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sectors_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pitches_id" integer;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_sources" ADD CONSTRAINT "posts_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_sources" ADD CONSTRAINT "_posts_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pitches_research_paths" ADD CONSTRAINT "pitches_research_paths_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pitches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pitches_candidate_sources" ADD CONSTRAINT "pitches_candidate_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pitches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pitches" ADD CONSTRAINT "pitches_suggested_sector_id_sectors_id_fk" FOREIGN KEY ("suggested_sector_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pitches" ADD CONSTRAINT "pitches_linked_post_id_posts_id_fk" FOREIGN KEY ("linked_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "posts_sources_order_idx" ON "posts_sources" USING btree ("_order");
  CREATE INDEX "posts_sources_parent_id_idx" ON "posts_sources" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_sources_order_idx" ON "_posts_v_version_sources" USING btree ("_order");
  CREATE INDEX "_posts_v_version_sources_parent_id_idx" ON "_posts_v_version_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "sectors_slug_idx" ON "sectors" USING btree ("slug");
  CREATE INDEX "sectors_updated_at_idx" ON "sectors" USING btree ("updated_at");
  CREATE INDEX "sectors_created_at_idx" ON "sectors" USING btree ("created_at");
  CREATE INDEX "pitches_research_paths_order_idx" ON "pitches_research_paths" USING btree ("_order");
  CREATE INDEX "pitches_research_paths_parent_id_idx" ON "pitches_research_paths" USING btree ("_parent_id");
  CREATE INDEX "pitches_candidate_sources_order_idx" ON "pitches_candidate_sources" USING btree ("_order");
  CREATE INDEX "pitches_candidate_sources_parent_id_idx" ON "pitches_candidate_sources" USING btree ("_parent_id");
  CREATE INDEX "pitches_suggested_sector_idx" ON "pitches" USING btree ("suggested_sector_id");
  CREATE INDEX "pitches_status_idx" ON "pitches" USING btree ("status");
  CREATE INDEX "pitches_linked_post_idx" ON "pitches" USING btree ("linked_post_id");
  CREATE INDEX "pitches_updated_at_idx" ON "pitches" USING btree ("updated_at");
  CREATE INDEX "pitches_created_at_idx" ON "pitches" USING btree ("created_at");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_sector_id_sectors_id_fk" FOREIGN KEY ("version_sector_id") REFERENCES "public"."sectors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pitches_fk" FOREIGN KEY ("pitches_id") REFERENCES "public"."pitches"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_sector_idx" ON "posts" USING btree ("sector_id");
  CREATE INDEX "_posts_v_version_version_sector_idx" ON "_posts_v" USING btree ("version_sector_id");
  CREATE INDEX "payload_locked_documents_rels_sectors_id_idx" ON "payload_locked_documents_rels" USING btree ("sectors_id");
  CREATE INDEX "payload_locked_documents_rels_pitches_id_idx" ON "payload_locked_documents_rels" USING btree ("pitches_id");`)

  // Seed the starting sectors. Raw SQL rather than payload.create so this
  // migration stays valid even if the collection is later renamed or removed.
  // Idempotent, so a re-run against a partially-seeded DB is safe.
  await db.execute(sql`
    INSERT INTO "sectors" ("name", "slug", "updated_at", "created_at") VALUES
      ('Energy-Tech',        'energy-tech',        now(), now()),
      ('Deep-Tech',          'deep-tech',          now(), now()),
      ('Industrials',        'industrials',        now(), now()),
      ('AI Infrastructure',  'ai-infrastructure',  now(), now()),
      ('Fund Performance',   'fund-performance',   now(), now()),
      ('Cross-Sector/Macro', 'cross-sector-macro', now(), now())
    ON CONFLICT ("slug") DO NOTHING;`)

  // Existing rows predate assetClass/sector. There is exactly one, an unpublished
  // test draft, so map it onto the new taxonomy rather than leaving it broken.
  await db.execute(sql`
    UPDATE "posts" SET
      "asset_class" = 'private-equity',
      "sector_id" = (SELECT "id" FROM "sectors" WHERE "slug" = CASE "industry"
        WHEN 'data-centers'   THEN 'ai-infrastructure'
        WHEN 'nuclear-energy' THEN 'energy-tech'
        ELSE 'cross-sector-macro' END)
    WHERE "industry" IS NOT NULL AND "sector_id" IS NULL;`)

  await db.execute(sql`
    UPDATE "_posts_v" SET
      "version_asset_class" = 'private-equity',
      "version_sector_id" = (SELECT "id" FROM "sectors" WHERE "slug" = CASE "version_industry"
        WHEN 'data-centers'   THEN 'ai-infrastructure'
        WHEN 'nuclear-energy' THEN 'energy-tech'
        ELSE 'cross-sector-macro' END)
    WHERE "version_industry" IS NOT NULL AND "version_sector_id" IS NULL;`)

  // Existing users predate the roles field; without this they'd have no role
  // at all and isBot()/isAdmin() would both be false, locking them out of
  // role-gated actions.
  await db.execute(sql`
    INSERT INTO "users_roles" ("order", "parent_id", "value")
    SELECT 1, u."id", 'admin'::"enum_users_roles"
    FROM "users" u
    WHERE NOT EXISTS (SELECT 1 FROM "users_roles" r WHERE r."parent_id" = u."id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sectors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pitches_research_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pitches_candidate_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pitches" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "posts_sources" CASCADE;
  DROP TABLE "_posts_v_version_sources" CASCADE;
  DROP TABLE "sectors" CASCADE;
  DROP TABLE "pitches_research_paths" CASCADE;
  DROP TABLE "pitches_candidate_sources" CASCADE;
  DROP TABLE "pitches" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_sector_id_sectors_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_sector_id_sectors_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sectors_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pitches_fk";
  
  DROP INDEX "posts_sector_idx";
  DROP INDEX "_posts_v_version_version_sector_idx";
  DROP INDEX "payload_locked_documents_rels_sectors_id_idx";
  DROP INDEX "payload_locked_documents_rels_pitches_id_idx";
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";
  ALTER TABLE "posts" DROP COLUMN "asset_class";
  ALTER TABLE "posts" DROP COLUMN "sector_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_asset_class";
  ALTER TABLE "_posts_v" DROP COLUMN "version_sector_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sectors_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pitches_id";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_posts_asset_class";
  DROP TYPE "public"."enum__posts_v_version_asset_class";
  DROP TYPE "public"."enum_pitches_geography";
  DROP TYPE "public"."enum_pitches_asset_class";
  DROP TYPE "public"."enum_pitches_post_format";
  DROP TYPE "public"."enum_pitches_status";`)
}
