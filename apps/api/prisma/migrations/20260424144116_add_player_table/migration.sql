-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "season" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "number" INTEGER,
    "position" TEXT,
    "age" INTEGER,
    "team_id" TEXT,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "matches_played" INTEGER NOT NULL DEFAULT 0,
    "rating" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "standings_league_id_team_id_season_key" ON "standings"("league_id", "team_id", "season");

-- CreateIndex
CREATE UNIQUE INDEX "players_external_id_key" ON "players"("external_id");

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
