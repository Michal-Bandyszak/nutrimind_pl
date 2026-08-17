-- Apply after ingredient reconciliation has removed duplicate recipe/ingredient pairs.
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_ingredientId_key"
ON "RecipeIngredient"("recipeId", "ingredientId");
