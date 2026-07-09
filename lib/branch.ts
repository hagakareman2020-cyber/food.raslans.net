// إدارة الفرع النشِط للمالك: كل فرع = صف مطعم مستقل بنفس المالك.
// الفرع المختار يُحفظ في كوكي ويُحترم في كل الاستعلامات.
import "server-only";
import { cookies } from "next/headers";
import type { Restaurant } from "@/lib/types";

export const ACTIVE_BRANCH_COOKIE = "active_branch";

// يختار الفرع النشِط من قائمة فروع المالك حسب الكوكي، وإلا أول فرع.
export async function resolveActiveOwned(
  owned: Restaurant[]
): Promise<Restaurant | null> {
  if (!owned || owned.length === 0) return null;
  const store = await cookies();
  const wanted = store.get(ACTIVE_BRANCH_COOKIE)?.value;
  if (wanted) {
    const match = owned.find((r) => r.id === wanted);
    if (match) return match;
  }
  return owned[0];
}
