import { buildShoppingList } from '@/lib/services/ShoppingListBuilder';
import ShoppingClient from './ShoppingClient';

type Props = {
  planId: string;
  householdId: string;
};

export default async function ShoppingPageContent({ planId, householdId }: Props) {
  const shoppingList = await buildShoppingList(planId, householdId);
  return <ShoppingClient list={shoppingList} />;
}
