// نوع النشاط: مطعم / كافيه / الاثنين معاً — يتحكم في المصطلحات المعروضة
// يُخزَّن داخل restaurants.settings.business_type (بدون تعديل سكيمة)

export type BusinessType = "restaurant" | "cafe" | "both";

export const BUSINESS_TYPES: { value: BusinessType; label: string; emoji: string }[] = [
  { value: "restaurant", label: "مطعم", emoji: "🍽️" },
  { value: "cafe", label: "كافيه", emoji: "☕" },
  { value: "both", label: "مطعم وكافيه", emoji: "🍽️☕" },
];

export type BusinessLabels = {
  type: BusinessType;
  typeName: string;     // اسم النوع: مطعم / كافيه / مطعم وكافيه
  place: string;        // المطعم / الكافيه / المكان
  yourPlace: string;    // مطعمك / الكافيه بتاعك / مكانك
  addYours: string;     // أضف مطعمك / أضف الكافيه بتاعك / أضف مكانك
  namePlaceholder: string;
  kitchen: string;      // المطبخ / البار / المطبخ والبار
  kitchenBoard: string; // شاشة المطبخ / شاشة البار
  kitchenIcon: string;
  emptyOrdersIcon: string;
  itemsWord: string;    // الأطباق / المشروبات / الأصناف
};

const LABELS: Record<BusinessType, BusinessLabels> = {
  restaurant: {
    type: "restaurant",
    typeName: "مطعم",
    place: "المطعم",
    yourPlace: "مطعمك",
    addYours: "أضف مطعمك",
    namePlaceholder: "مثال: مطعم الأصيل",
    kitchen: "المطبخ",
    kitchenBoard: "شاشة المطبخ",
    kitchenIcon: "👨‍🍳",
    emptyOrdersIcon: "🍳",
    itemsWord: "الأطباق",
  },
  cafe: {
    type: "cafe",
    typeName: "كافيه",
    place: "الكافيه",
    yourPlace: "الكافيه",
    addYours: "أضف الكافيه بتاعك",
    namePlaceholder: "مثال: كافيه لاونج",
    kitchen: "البار",
    kitchenBoard: "شاشة البار",
    kitchenIcon: "☕",
    emptyOrdersIcon: "☕",
    itemsWord: "المشروبات",
  },
  both: {
    type: "both",
    typeName: "مطعم وكافيه",
    place: "المكان",
    yourPlace: "مكانك",
    addYours: "أضف مكانك",
    namePlaceholder: "مثال: مطعم وكافيه الأصيل",
    kitchen: "المطبخ والبار",
    kitchenBoard: "شاشة التحضير",
    kitchenIcon: "🍽️",
    emptyOrdersIcon: "🍽️",
    itemsWord: "الأصناف",
  },
};

// استخراج نوع النشاط من الإعدادات (الافتراضي: مطعم)
export function getBusinessType(settings: unknown): BusinessType {
  const t = (settings as { business_type?: string } | null)?.business_type;
  return t === "cafe" || t === "both" ? t : "restaurant";
}

// جلب مجموعة المصطلحات المناسبة للنشاط
export function businessLabels(settings: unknown): BusinessLabels {
  return LABELS[getBusinessType(settings)];
}
