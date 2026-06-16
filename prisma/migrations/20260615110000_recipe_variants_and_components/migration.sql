-- AlterTable
ALTER TABLE "Recipe"
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'meal',
ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT 'base',
ADD COLUMN "adjustmentNote" TEXT,
ADD COLUMN "variantOfId" TEXT;

-- DropIndex
DROP INDEX "Recipe_name_sourceDiet_key";

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL,
    "parentRecipeId" TEXT NOT NULL,
    "componentRecipeId" TEXT NOT NULL,
    "servingsUsed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "displayText" TEXT,
    "note" TEXT,
    "replacedIngredients" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_name_sourceDiet_variantKey_key" ON "Recipe"("name", "sourceDiet", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeComponent_parentRecipeId_componentRecipeId_key" ON "RecipeComponent"("parentRecipeId", "componentRecipeId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_variantOfId_fkey" FOREIGN KEY ("variantOfId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_parentRecipeId_fkey" FOREIGN KEY ("parentRecipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_componentRecipeId_fkey" FOREIGN KEY ("componentRecipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
