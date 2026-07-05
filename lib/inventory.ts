// منطق المخزون: خصم عند الطلب + إخفاء الطبق آلياً عند نفاد الخامة
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

// يعيد حساب توفّر المنتجات المرتبطة بمخزون: المنتج غير متوفّر إن نقصت أي خامة عن الكمية المطلوبة له
export async function recomputeStock(client: any, restaurantId: string) {
  const { data: links } = await client
    .from("product_ingredients")
    .select("product_id, amount, products!inner(restaurant_id), inventory_items!inner(quantity)")
    .eq("products.restaurant_id", restaurantId);

  if (!links) return;

  const byProduct = new Map<string, boolean>();
  for (const l of links as any[]) {
    const enough = Number(l.inventory_items?.quantity ?? 0) >= Number(l.amount ?? 0);
    const prev = byProduct.get(l.product_id);
    byProduct.set(l.product_id, prev === undefined ? enough : prev && enough);
  }

  for (const [productId, available] of byProduct) {
    await client.from("products").update({ in_stock: available }).eq("id", productId);
  }
}

// يخصم الخامات المستهلكة من طلب ثم يعيد حساب التوفّر
export async function consumeInventory(
  client: any,
  restaurantId: string,
  items: { product_id: string; quantity: number }[]
) {
  const productIds = items.map((i) => i.product_id).filter(Boolean);
  if (productIds.length === 0) return;

  const { data: links } = await client
    .from("product_ingredients")
    .select("product_id, inventory_item_id, amount")
    .in("product_id", productIds);
  if (!links || links.length === 0) return;

  // إجمالي الاستهلاك لكل خامة
  const need = new Map<string, number>();
  for (const it of items) {
    for (const l of (links as any[]).filter((x) => x.product_id === it.product_id)) {
      need.set(l.inventory_item_id, (need.get(l.inventory_item_id) || 0) + Number(l.amount) * it.quantity);
    }
  }

  const invIds = [...need.keys()];
  const { data: inv } = await client.from("inventory_items").select("id, quantity").in("id", invIds);
  for (const item of (inv as any[]) ?? []) {
    const newQ = Math.max(0, Number(item.quantity) - (need.get(item.id) || 0));
    await client.from("inventory_items").update({ quantity: newQ }).eq("id", item.id);
  }

  await recomputeStock(client, restaurantId);
}
