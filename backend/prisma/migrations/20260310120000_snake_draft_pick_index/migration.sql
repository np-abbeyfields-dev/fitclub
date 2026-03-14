-- Snake draft: track whose turn it is (global pick index).
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "draft_pick_index" INTEGER NOT NULL DEFAULT 0;
