import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroq, GROQ_MODEL } from "@/lib/groq";

// نصائح ذكية للمطبخ والأطباق بناءً على تحليل المبيعات
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: { summary?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const system = [
    "أنت مستشار مطاعم خبير. حلّل بيانات المبيعات المرسلة وقدّم نصائح عملية موجزة.",
    "أعد JSON فقط بالشكل:",
    `{"kitchen": [string, ...], "dishes": [string, ...], "summary": string}`,
    "kitchen: نصائح للمطبخ (سرعة، تحضير، هدر). dishes: نصائح للأطباق (تسعير، ترويج، حذف/تطوير الأصناف الضعيفة).",
    "كل نصيحة جملة قصيرة عملية بالعربية. 3-5 نصائح لكل قسم.",
  ].join("\n");

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(body.summary ?? {}) },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const advice = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json({ advice });
  } catch (e) {
    return NextResponse.json({ error: "فشل توليد النصائح: " + (e as Error).message }, { status: 502 });
  }
}
