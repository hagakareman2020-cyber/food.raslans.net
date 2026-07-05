import type { Metadata } from "next";
import { Cairo, Lalezar, Rakkas, Aref_Ruqaa, Reem_Kufi } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

// خطوط عرض متنوعة للعناوين — كل تصميم منيو يستخدم واحداً مختلفاً
const lalezar = Lalezar({ variable: "--font-display-1", weight: "400", subsets: ["arabic", "latin"] });
const rakkas = Rakkas({ variable: "--font-display-2", weight: "400", subsets: ["arabic", "latin"] });
const arefRuqaa = Aref_Ruqaa({ variable: "--font-display-3", weight: "700", subsets: ["arabic", "latin"] });
const reemKufi = Reem_Kufi({ variable: "--font-display-4", weight: "700", subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "سيستم إدارة المطاعم الذكي",
  description:
    "نظام متكامل لإدارة المطاعم من طلبات العملاء وإدارة المطبخ إلى تحليل أفضل الأطباق وأداء المبيعات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${lalezar.variable} ${rakkas.variable} ${arefRuqaa.variable} ${reemKufi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
