// أنواع صفوف قاعدة البيانات المستخدمة في الواجهة

export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  settings: {
    free_water_bottles?: number;
    water_bottles?: number;
    water_price?: number;
    languages?: string[];
    menu_pdf_url?: string;
    menu_source?: "generated" | "pdf";
    address?: string;
    business_type?: "restaurant" | "cafe" | "both";
  };
  status: string;
  created_at: string;
};

export type StaffRole = "accountant" | "chef" | "assistant";
export type Section = "kitchen" | "accounting";

export type Staff = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: StaffRole;
  sections: Section[];
  created_at: string;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
  created_at: string;
};

export type ProductTag = "nuts" | "spicy" | "vegetarian" | "vegan" | "gluten";

export type Product = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string | null;
  ingredients: string | null;
  price: number;
  image_url: string | null;
  prep_minutes: number;
  tags: ProductTag[];
  is_available: boolean;
  in_stock: boolean;
  sort_order: number;
  created_at: string;
};

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type Order = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: number | null;
  status: OrderStatus;
  total: number;
  eta_minutes: number | null;
  session_id: string | null;
  note: string | null;
  created_at: string;
  ready_at: string | null;
  served_at: string | null;
};

export const TAG_LABELS: Record<ProductTag, string> = {
  nuts: "🥜 مكسرات",
  spicy: "🌶️ حار",
  vegetarian: "🥗 نباتي",
  vegan: "🌱 نباتي صرف",
  gluten: "🌾 جلوتين",
};
