-- DropIndex (Prisma may have created these; drop columns and indexes go with them)
ALTER TABLE "Metric" DROP COLUMN IF EXISTS "variant";
ALTER TABLE "Metric" DROP COLUMN IF EXISTS "country";
ALTER TABLE "Metric" DROP COLUMN IF EXISTS "device";
ALTER TABLE "Metric" DROP COLUMN IF EXISTS "segment";
