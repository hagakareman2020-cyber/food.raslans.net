// إعدادات المياه المضافة تلقائياً لكل طلب
type SettingsLike = {
  water_bottles?: number;
  water_price?: number;
  free_water_bottles?: number; // توافق قديم
} | null | undefined;

export function waterConfig(settings: SettingsLike): { bottles: number; price: number } {
  const bottles = Number(settings?.water_bottles ?? settings?.free_water_bottles ?? 2);
  const price = Number(settings?.water_price ?? 0);
  return { bottles: isNaN(bottles) ? 0 : bottles, price: isNaN(price) ? 0 : price };
}
