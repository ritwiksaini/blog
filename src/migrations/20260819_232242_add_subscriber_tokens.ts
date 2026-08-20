import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscribers" ADD COLUMN "confirm_token" varchar;
  ALTER TABLE "subscribers" ADD COLUMN "unsubscribe_token" varchar;
  CREATE INDEX "subscribers_confirm_token_idx" ON "subscribers" USING btree ("confirm_token");
  CREATE INDEX "subscribers_unsubscribe_token_idx" ON "subscribers" USING btree ("unsubscribe_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "subscribers_confirm_token_idx";
  DROP INDEX "subscribers_unsubscribe_token_idx";
  ALTER TABLE "subscribers" DROP COLUMN "confirm_token";
  ALTER TABLE "subscribers" DROP COLUMN "unsubscribe_token";`)
}
