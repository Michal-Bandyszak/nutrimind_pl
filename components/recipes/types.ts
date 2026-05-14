export type FileData = {
  name: string;
  type: string;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  batchFriendly: boolean;
  maxStorageDays: number;
  baseServings?: number;
  ingredientBasis?: 'per-serving' | 'per-whole';
  kcalPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  instructions: string[];
  ingredients: {
    name: string;
    amountG: number;
    displayText?: string;
    category: string;
    scalesLinearly: boolean;
  }[];
};

export type IngredientRow = {
  id: string;
  name: string;
  amountG: string;
  category: string;
  scalesLinearly: boolean;
};

export type StepRow = {
  id: string;
  text: string;
};
