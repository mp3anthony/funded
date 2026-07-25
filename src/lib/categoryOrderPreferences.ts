import { supabase } from "@/lib/supabase";

type PreferenceColumn = "bill_category_order" | "goal_category_order";

function cleanOrder(
  raw: unknown,
  remap: Record<string, string>,
  validCategories: string[]
): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      (raw as string[])
        .map((c) => remap[c] || c)
        .filter((c) => validCategories.includes(c))
    )
  );
}

// Loads the signed-in user's saved category order for `column`. Falls back to
// (and migrates up) any pre-existing localStorage order for users who had one
// before this table existed, so a live order isn't lost on the DB switchover.
export async function loadCategoryOrder(
  userId: string,
  column: PreferenceColumn,
  localStorageKey: string,
  remap: Record<string, string>,
  validCategories: string[]
): Promise<string[]> {
  const { data } = await supabase
    .from("user_preferences")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  const dbOrder = data ? cleanOrder((data as Record<string, unknown>)[column], remap, validCategories) : [];
  if (dbOrder.length > 0) return dbOrder;

  const savedLocal = localStorage.getItem(localStorageKey);
  if (!savedLocal) return [];

  try {
    const localOrder = cleanOrder(JSON.parse(savedLocal), remap, validCategories);
    if (localOrder.length > 0) {
      await supabase
        .from("user_preferences")
        .upsert({ user_id: userId, [column]: localOrder }, { onConflict: "user_id" });
    }
    return localOrder;
  } catch {
    return [];
  }
}

export async function saveCategoryOrder(
  userId: string,
  column: PreferenceColumn,
  order: string[]
): Promise<void> {
  await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, [column]: order }, { onConflict: "user_id" });
}
