import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP COLUMN "industry";
  ALTER TABLE "_posts_v" DROP COLUMN "version_industry";
  DROP TYPE "public"."enum_posts_industry";
  DROP TYPE "public"."enum__posts_v_version_industry";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_industry" AS ENUM('private-equity', 'venture-capital', 'data-centers', 'nuclear-energy');
  CREATE TYPE "public"."enum__posts_v_version_industry" AS ENUM('private-equity', 'venture-capital', 'data-centers', 'nuclear-energy');
  ALTER TABLE "posts" ADD COLUMN "industry" "enum_posts_industry";
  ALTER TABLE "_posts_v" ADD COLUMN "version_industry" "enum__posts_v_version_industry";`)
}
