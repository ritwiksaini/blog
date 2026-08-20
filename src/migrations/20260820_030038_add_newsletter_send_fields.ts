import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "newsletter_note" varchar;
  ALTER TABLE "posts" ADD COLUMN "newsletter_sent_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_newsletter_note" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_newsletter_sent_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP COLUMN "newsletter_note";
  ALTER TABLE "posts" DROP COLUMN "newsletter_sent_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_newsletter_note";
  ALTER TABLE "_posts_v" DROP COLUMN "version_newsletter_sent_at";`)
}
