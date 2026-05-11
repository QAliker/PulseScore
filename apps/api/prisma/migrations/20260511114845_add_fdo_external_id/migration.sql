-- AlterTable
ALTER TABLE "leagues" ADD COLUMN "fdo_external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leagues_fdo_external_id_key" ON "leagues"("fdo_external_id");

-- AlterTable
ALTER TABLE "teams" ADD COLUMN "fdo_external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "teams_fdo_external_id_key" ON "teams"("fdo_external_id");
