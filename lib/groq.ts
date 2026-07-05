// مساعد Groq لتوليد المنيو — يعمل على السيرفر فقط
import "server-only";
import Groq from "groq-sdk";

export const GROQ_MODEL = "openai/gpt-oss-120b";

export function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export type MenuInput = {
  restaurantName: string;
  products: { name: string; category: string }[];
};

// الـ AI يُحسّن العرض فقط ولا يتحكم في بيانات المنتجات (الاسم/السعر/المكونات/الوسوم)
export function buildMenuPrompt(input: MenuInput) {
  const system = [
    "أنت خبير هوية بصرية وتصميم قوائم طعام. مهمتك تحسين عرض منيو مطعم موجود بالفعل.",
    "أعد الناتج بصيغة JSON فقط بالشكل التالي:",
    `{`,
    `  "theme": {`,
    `    "cuisine": string,        // نوع المطبخ بالعربية، مثال: "شاورما ومشويات"`,
    `    "emoji": string,          // إيموجي واحد يمثل المطعم`,
    `    "primary": string,        // لون هيكس أساسي يناسب الأكل`,
    `    "accent": string,         // لون هيكس ثانوي متناسق`,
    `    "mood": string,           // warm أو fresh أو elegant أو bold`,
    `    "tagline": string,        // شعار تسويقي قصير (ليس اسم مطعم)`,
    `    "hero_query": string      // كلمة بحث إنجليزية لصورة طبق مميّز`,
    `  },`,
    `  "items": [{`,
    `    "name_ar": string,        // نفس اسم المنتج المُدخل حرفياً بدون أي تغيير`,
    `    "name_en": string,        // ترجمة إنجليزية للاسم`,
    `    "emoji": string,          // إيموجي يمثل الطبق`,
    `    "image_query": string,    // كلمة بحث إنجليزية دقيقة لصورة الطبق`,
    `    "description_ar": string  // وصف شهي قصير جذاب بالعربية`,
    `  }]`,
    `}`,
    "🔴 قواعد صارمة يمنع مخالفتها:",
    "- لا تخترع منتجات جديدة ولا تحذف أياً من المنتجات المُدخلة. أعد عنصراً واحداً لكل منتج مُدخل وبنفس ترتيبه.",
    "- name_ar يجب أن يطابق اسم المنتج المُدخل حرفياً بدون أي تعديل.",
    "- ممنوع منعاً باتاً إخراج: مكونات (ingredients)، أو وسوم (tags)، أو أسعار — هذه بيانات صاحب المطعم ولا تخصك.",
    "- ممنوع اختراع اسم مطعم أو تغييره. أنت لا تخرج اسم المطعم إطلاقاً.",
    "- image_query و hero_query بالإنجليزية ووصفية للطعام لجلب صورة فوتوغرافية مطابقة.",
    "دورك محصور في: theme + (لكل منتج) name_en + emoji + image_query + description_ar فقط.",
  ].join("\n");

  const user = JSON.stringify(input, null, 2);
  return { system, user };
}
