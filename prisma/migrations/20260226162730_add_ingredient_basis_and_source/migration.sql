-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prepTimeMin" INTEGER,
    "cookTimeMin" INTEGER,
    "batchFriendly" BOOLEAN NOT NULL DEFAULT false,
    "maxStorageDays" INTEGER NOT NULL DEFAULT 1,
    "kcalPerServing" REAL,
    "proteinG" REAL,
    "carbsG" REAL,
    "fatG" REAL,
    "fiberG" REAL,
    "instructions" TEXT NOT NULL DEFAULT '[]',
    "sourceDiet" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "baseServings" INTEGER NOT NULL DEFAULT 1,
    "ingredientBasis" TEXT NOT NULL DEFAULT 'per-serving',
    "source" TEXT NOT NULL DEFAULT 'dietitian',
    "nutritionVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Recipe" ("batchFriendly", "carbsG", "cookTimeMin", "createdAt", "fatG", "fiberG", "id", "instructions", "kcalPerServing", "maxStorageDays", "name", "prepTimeMin", "proteinG", "sourceDiet", "tags", "type") SELECT "batchFriendly", "carbsG", "cookTimeMin", "createdAt", "fatG", "fiberG", "id", "instructions", "kcalPerServing", "maxStorageDays", "name", "prepTimeMin", "proteinG", "sourceDiet", "tags", "type" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE UNIQUE INDEX "Recipe_name_sourceDiet_key" ON "Recipe"("name", "sourceDiet");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
