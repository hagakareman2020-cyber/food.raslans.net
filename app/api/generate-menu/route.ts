import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";
import { getGroq, GROQ_MODEL, buildMenuPrompt, type MenuInput } from "@/lib/groq";
import { fetchFoodImages, fetchFoodImage } from "@/lib/images";
import { randomDesignIndex } from "@/lib/menuDesigns";
import type { Category, Product } from "@/lib/types";

const COOLDOWN_SECONDS = 60;

type Enhancement = {
  name_ar?: string;
  name_en?: string;
  emoji?: string;
  image_query?: string;
  description_ar?: string;
};

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // الفرع النشِط (يحترم اختيار الفرع) بدل أول مطعم
  const restaurant = await getMyRestaurant();
  if (!restaurant)
    return NextResponse.json({ error: "لا يوجد مطعم" }, { status: 400 });

  // كولداون 60 ثانية
  const { data: last } = await supabase
    .from("menu_versions")
    .select("created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return NextResponse.json(
        { error: "cooldown", remaining: Math.ceil(COOLDOWN_SECONDS - elapsed) },
        { status: 429 }
      );
    }
  }

  // المنتجات والأقسام الحقيقية
  const [{ data: catData }, { data: prodData }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
    supabase.from("products").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
  ]);
  const categories = (catData as Category[]) ?? [];
  const products = (prodData as Product[]) ?? [];

  if (products.length === 0) {
    return NextResponse.json(
      { error: "أضف منتجات أولاً قبل توليد المنيو" },
      { status: 400 }
    );
  }

  const catName = new Map(categories.map((c) => [c.id, c.name_ar]));

  const input: MenuInput = {
    restaurantName: restaurant.name,
    products: products.map((p) => ({
      name: p.name_ar,
      category: (p.category_id && catName.get(p.category_id)) || "أخرى",
    })),
  };

  const { system, user: userPrompt } = buildMenuPrompt(input);

  // استدعاء الذكاء الاصطناعي للحصول على الهوية والتحسينات فقط
  let theme: Record<string, unknown> = {};
  let enhancements: Enhancement[] = [];
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    theme = parsed.theme ?? {};
    enhancements = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (e) {
    return NextResponse.json(
      { error: "فشل توليد المنيو: " + (e as Error).message },
      { status: 502 }
    );
  }

  // خريطة التحسينات باسم المنتج
  const enhByName = new Map<string, Enhancement>();
  enhancements.forEach((e) => {
    if (e.name_ar) enhByName.set(norm(e.name_ar), e);
  });

  // تجميع المنيو النهائي من البيانات الحقيقية + تحسينات AI
  type BuiltItem = {
    name_ar: string;
    name_en?: string;
    emoji?: string;
    description_ar?: string;
    ingredients: string | null;   // حقيقي
    tags: string[];               // حقيقي
    suggested_price: number;      // حقيقي
    prep_minutes: number;         // حقيقي
    image_url: string | null;     // صورة المستخدم أو Pexels لاحقاً
    image_query?: string;
  };

  const buildItem = (p: Product): BuiltItem => {
    const enh = enhByName.get(norm(p.name_ar)) ?? {};
    return {
      name_ar: p.name_ar,
      name_en: enh.name_en || p.name_en || undefined,
      emoji: enh.emoji,
      description_ar: enh.description_ar,
      ingredients: p.ingredients,
      tags: p.tags ?? [],
      suggested_price: Number(p.price),
      prep_minutes: p.prep_minutes,
      image_url: p.image_url ?? null, // نفضّل صورة المستخدم
      image_query: enh.image_query || p.name_en || p.name_ar,
    };
  };

  const builtCategories = categories
    .map((c) => ({
      name_ar: c.name_ar,
      name_en: c.name_en ?? undefined,
      emoji: enhByName.get(norm(c.name_ar))?.emoji,
      items: products.filter((p) => p.category_id === c.id).map(buildItem),
    }))
    .filter((c) => c.items.length > 0);

  // منتجات بدون قسم
  const uncategorized = products.filter((p) => !p.category_id);
  if (uncategorized.length) {
    builtCategories.push({
      name_ar: "أخرى",
      name_en: undefined,
      emoji: undefined,
      items: uncategorized.map(buildItem),
    });
  }

  // جلب الصور للمنتجات التي لا تملك صورة من المستخدم
  const needImg: BuiltItem[] = [];
  for (const c of builtCategories) for (const it of c.items) if (!it.image_url) needImg.push(it);
  const urls = await fetchFoodImages(needImg.map((it) => it.image_query || "food dish"));
  needImg.forEach((it, i) => {
    it.image_url = urls[i];
  });

  // صورة البطل
  const heroQuery = (theme.hero_query as string) || (theme.cuisine as string) || "restaurant food";
  const hero_image = await fetchFoodImage(heroQuery);

  const content = {
    title: restaurant.name, // اسم المطعم الحقيقي دائماً
    description: (theme.tagline as string) || "",
    theme: { ...theme, hero_image },
    design: { template: randomDesignIndex() },
    categories: builtCategories,
  };

  const { data: version, error } = await supabase
    .from("menu_versions")
    .insert({ restaurant_id: restaurant.id, content, model: GROQ_MODEL })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ version });
}
