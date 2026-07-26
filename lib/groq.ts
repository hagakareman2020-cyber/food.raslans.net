// مساعد Groq لتوليد المنيو — يعمل على السيرفر فقط
import "server-only";
import Groq from "groq-sdk";

export const GROQ_MODEL = "openai/gpt-oss-120b";

export function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export type BusinessType = "restaurant" | "cafe" | "both";

export type MenuInput = {
  restaurantName: string;
  businessType?: BusinessType;
  products: { name: string; category: string }[];
};

// وصف النشاط ونوع الأصناف حسب النوع (يوجّه الذكاء الاصطناعي للطعام و/أو المشروبات)
const BIZ_HINT: Record<BusinessType, { place: string; items: string; emojiHint: string }> = {
  restaurant: { place: "مطعم", items: "أطباق الطعام", emojiHint: "إيموجي يمثل الطبق" },
  cafe: { place: "كافيه", items: "المشروبات والقهوة والحلويات", emojiHint: "إيموجي يمثل المشروب/الصنف (☕🧋🍰)" },
  both: { place: "مطعم وكافيه", items: "أطباق الطعام والمشروبات معاً", emojiHint: "إيموجي يمثل الصنف (طعام أو مشروب)" },
};

// الـ AI يُحسّن العرض فقط ولا يتحكم في بيانات المنتجات (الاسم/السعر/المكونات/الوسوم)
export function buildMenuPrompt(input: MenuInput) {
  const biz = BIZ_HINT[input.businessType ?? "restaurant"];
  const system = [
    `أنت خبير هوية بصرية وتصميم قوائم (منيو). مهمتك تحسين عرض منيو ${biz.place} موجود بالفعل. أصنافه هي: ${biz.items}.`,
    "أعد الناتج بصيغة JSON فقط بالشكل التالي:",
    `{`,
    `  "theme": {`,
    `    "cuisine": string,        // نوع النشاط/التخصص بالعربية، مثال: "شاورما ومشويات" أو "قهوة مختصة وحلويات"`,
    `    "emoji": string,          // إيموجي واحد يمثل النشاط`,
    `    "primary": string,        // لون هيكس أساسي مناسب`,
    `    "accent": string,         // لون هيكس ثانوي متناسق`,
    `    "mood": string,           // warm أو fresh أو elegant أو bold`,
    `    "tagline": string,        // شعار تسويقي قصير (ليس اسم النشاط)`,
    `    "hero_query": string      // كلمة بحث إنجليزية لصورة صنف مميّز`,
    `  },`,
    `  "items": [{`,
    `    "name_ar": string,        // نفس اسم المنتج المُدخل حرفياً بدون أي تغيير`,
    `    "name_en": string,        // ترجمة إنجليزية للاسم`,
    `    "emoji": string,          // ${biz.emojiHint}`,
    `    "image_query": string,    // كلمة بحث إنجليزية دقيقة لصورة الصنف`,
    `    "description_ar": string  // وصف شهي قصير جذاب بالعربية`,
    `  }]`,
    `}`,
    "🔴 قواعد صارمة يمنع مخالفتها:",
    "- لا تخترع منتجات جديدة ولا تحذف أياً من المنتجات المُدخلة. أعد عنصراً واحداً لكل منتج مُدخل وبنفس ترتيبه.",
    "- name_ar يجب أن يطابق اسم المنتج المُدخل حرفياً بدون أي تعديل.",
    "- ممنوع منعاً باتاً إخراج: مكونات (ingredients)، أو وسوم (tags)، أو أسعار — هذه بيانات صاحب النشاط ولا تخصك.",
    "- ممنوع اختراع اسم النشاط أو تغييره. أنت لا تخرج اسم النشاط إطلاقاً.",
    "- image_query و hero_query بالإنجليزية ووصفية للصنف (طعام أو مشروب) لجلب صورة فوتوغرافية مطابقة.",
    "دورك محصور في: theme + (لكل منتج) name_en + emoji + image_query + description_ar فقط.",
  ].join("\n");

  const user = JSON.stringify(input, null, 2);
  return { system, user };
}
