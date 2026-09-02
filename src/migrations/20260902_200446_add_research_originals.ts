import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_syndication_kind" AS ENUM('post-syndication', 'research-original');
  CREATE TABLE "syndication_source_anchors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  ALTER TABLE "syndication" ALTER COLUMN "post_id" DROP NOT NULL;
  ALTER TABLE "syndication" ADD COLUMN "kind" "enum_syndication_kind" DEFAULT 'post-syndication' NOT NULL;
  ALTER TABLE "syndication" ADD COLUMN "topic" varchar;
  ALTER TABLE "syndication_source_anchors" ADD CONSTRAINT "syndication_source_anchors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."syndication"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "syndication_source_anchors_order_idx" ON "syndication_source_anchors" USING btree ("_order");
  CREATE INDEX "syndication_source_anchors_parent_id_idx" ON "syndication_source_anchors" USING btree ("_parent_id");
  CREATE INDEX "syndication_kind_idx" ON "syndication" USING btree ("kind");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "syndication_source_anchors" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "syndication_source_anchors" CASCADE;
  DROP INDEX "syndication_kind_idx";
  ALTER TABLE "syndication" ALTER COLUMN "post_id" SET NOT NULL;
  ALTER TABLE "syndication" DROP COLUMN "kind";
  ALTER TABLE "syndication" DROP COLUMN "topic";
  DROP TYPE "public"."enum_syndication_kind";`)
}
