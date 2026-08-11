-- CreateEnum
CREATE TYPE "Color" AS ENUM ('white', 'black');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'normal', 'hard');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('active', 'finished');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('win', 'loss', 'draw');

-- CreateEnum
CREATE TYPE "EndedReason" AS ENUM ('checkmate', 'stalemate', 'resign', 'fifty_move', 'threefold', 'insufficient_material');

-- CreateEnum
CREATE TYPE "MoveClassification" AS ENUM ('good', 'inaccuracy', 'mistake', 'blunder');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" VARCHAR(16) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "color" "Color" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'active',
    "result" "GameResult",
    "ended_reason" "EndedReason",
    "move_count" INTEGER NOT NULL DEFAULT 0,
    "illegal_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "san" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_analysis" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "eval_cp" INTEGER NOT NULL,
    "classification" "MoveClassification" NOT NULL,
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE INDEX "games_user_id_status_idx" ON "games"("user_id", "status");

-- CreateIndex
CREATE INDEX "games_user_id_ended_at_idx" ON "games"("user_id", "ended_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "moves_game_id_ply_key" ON "moves"("game_id", "ply");

-- CreateIndex
CREATE UNIQUE INDEX "game_analysis_game_id_ply_key" ON "game_analysis"("game_id", "ply");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_analysis" ADD CONSTRAINT "game_analysis_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX one_active_game_per_user
  ON games (user_id)
  WHERE status = 'active';

ALTER TABLE games ADD CONSTRAINT finished_fields_consistent CHECK (
  (status = 'active'   AND result IS NULL     AND ended_reason IS NULL     AND ended_at IS NULL) OR
  (status = 'finished' AND result IS NOT NULL AND ended_reason IS NOT NULL AND ended_at IS NOT NULL)
);

CREATE OR REPLACE FUNCTION block_finished_game_moves()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT status FROM games WHERE id = NEW.game_id) = 'finished' THEN
    RAISE EXCEPTION 'cannot add moves to a finished game';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moves_immutable_after_finish
  BEFORE INSERT ON moves
  FOR EACH ROW EXECUTE FUNCTION block_finished_game_moves();
