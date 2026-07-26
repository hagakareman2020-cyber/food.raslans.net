import type { Metadata, Viewport } from "next";
import { Cairo, Lalezar, Rakkas, Aref_Ruqaa, Reem_Kufi } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

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
  applicationName: "منيو الذكي",
  title: "منيو الذكي — إدارة المطاعم والكافيهات",
  description:
    "نظام متكامل لإدارة المطاعم والكافيهات من طلبات العملاء وإدارة المطبخ والبار إلى تحليل أفضل الأصناف وأداء المبيعات — من رسلان للتسويق",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "منيو الذكي",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
