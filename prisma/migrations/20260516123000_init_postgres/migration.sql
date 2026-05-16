-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kcalPer100g" DOUBLE PRECISION,
    "proteinPer100g" DOUBLE PRECISION,
    "carbsPer100g" DOUBLE PRECISION,
    "fatPer100g" DOUBLE PRECISION,
    "fiberPer100g" DOUBLE PRECISION,
    "packageSizeG" DOUBLE PRECISION,
    "packageUnit" TEXT,
    "packageLabel" TEXT,
    "pieceWeightG" DOUBLE PRECISION,
    "hintUnitG" DOUBLE PRECISION,
    "hintUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prepTimeMin" INTEGER,
    "cookTimeMin" INTEGER,
    "batchFriendly" BOOLEAN NOT NULL DEFAULT false,
    "maxStorageDays" INTEGER NOT NULL DEFAULT 1,
    "kcalPerServing" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fiberG" DOUBLE PRECISION,
    "instructions" TEXT NOT NULL DEFAULT '[]',
    "sourceDiet" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "baseServings" INTEGER NOT NULL DEFAULT 1,
    "ingredientBasis" TEXT NOT NULL DEFAULT 'per-serving',
    "source" TEXT NOT NULL DEFAULT 'dietitian',
    "nutritionVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amountG" DOUBLE PRECISION NOT NULL,
    "displayText" TEXT,
    "scalesLinearly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Tydzień',
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanMeal" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "batchGroupId" TEXT,
    "batchDayNum" INTEGER,

    CONSTRAINT "MealPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthLog" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "morningDone" TEXT NOT NULL DEFAULT '[]',
    "eveningDone" TEXT NOT NULL DEFAULT '[]',
    "waterGlasses" INTEGER,
    "sleepH" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "energyLevel" INTEGER,
    "moodLevel" INTEGER,
    "pointsDiet" INTEGER,
    "pointsSupp" INTEGER,
    "pointsTrain" INTEGER,
    "pointsRoutine" INTEGER,
    "pointsRelax" INTEGER,
    "pointsMindset" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "personAName" TEXT NOT NULL DEFAULT 'Michał',
    "personAKcal" INTEGER NOT NULL DEFAULT 2500,
    "personBName" TEXT NOT NULL DEFAULT 'Osoba B',
    "personBKcal" INTEGER NOT NULL DEFAULT 1800,
    "defaultBatchConfig" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_name_sourceDiet_key" ON "Recipe"("name", "sourceDiet");

-- CreateIndex
CREATE UNIQUE INDEX "HealthLog_date_key" ON "HealthLog"("date");

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMeal" ADD CONSTRAINT "MealPlanMeal_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMeal" ADD CONSTRAINT "MealPlanMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
