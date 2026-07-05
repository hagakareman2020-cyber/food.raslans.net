// نظام تصاميم المنيو المتنوعة — كل توليد يختار قالباً مختلفاً
// (فونت + خلفية + نقوش + تخطيط). يُخزَّن رقم القالب داخل محتوى النسخة.
import type { CSSProperties } from "react";

export type PatternKind = "dots" | "diagonal" | "crosshatch" | "arabesque" | "grid" | "none";
export type ItemLayout = "photoCards" | "thumbRows" | "leaderList";
export type HeroStyle = "circle" | "banner" | "none";

export type MenuDesign = {
  id: number;
  name: string;
  scheme: "light" | "dark";
  bg: string;          // خلفية البوستر
  surface: string;     // خلفية بطاقة العنصر
  border: string;      // لون حدود البطاقات
  text: string;        // لون النص الأساسي
  muted: string;       // لون النص الباهت
  headingFont: string; // متغيّر خط العنوان
  pattern: PatternKind;
  layout: ItemLayout;
  hero: HeroStyle;
  radius: string;
};

export const MENU_DESIGNS: MenuDesign[] = [
  {
    id: 0,
    name: "كلاسيكي كريمي",
    scheme: "light",
    bg: "linear-gradient(180deg,#fdfaf3 0%,#f7efe0 100%)",
    surface: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    text: "#2b2118",
    muted: "rgba(43,33,24,0.6)",
    headingFont: "var(--font-display-3)", // Aref Ruqaa
    pattern: "arabesque",
    layout: "leaderList",
    hero: "banner",
    radius: "1rem",
  },
  {
    id: 1,
    name: "بطاقات عصرية",
    scheme: "light",
    bg: "#ffffff",
    surface: "#ffffff",
    border: "rgba(0,0,0,0.10)",
    text: "#1a1a1a",
    muted: "rgba(0,0,0,0.55)",
    headingFont: "var(--font-display-4)", // Reem Kufi
    pattern: "dots",
    layout: "photoCards",
    hero: "circle",
    radius: "1.25rem",
  },
  {
    id: 2,
    name: "فاخر ليلي",
    scheme: "dark",
    bg: "radial-gradient(120% 80% at 50% 0%,#2a241f 0%,#14110e 60%,#0a0807 100%)",
    surface: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.12)",
    text: "#f5efe6",
    muted: "rgba(245,239,230,0.6)",
    headingFont: "var(--font-display-1)", // Lalezar
    pattern: "diagonal",
    layout: "thumbRows",
    hero: "circle",
    radius: "1rem",
  },
  {
    id: 3,
    name: "ريفي دافئ",
    scheme: "light",
    bg: "linear-gradient(180deg,#fbf3ea 0%,#f3e3d0 100%)",
    surface: "#fffdf9",
    border: "rgba(120,72,20,0.18)",
    text: "#3a2a17",
    muted: "rgba(58,42,23,0.6)",
    headingFont: "var(--font-display-2)", // Rakkas
    pattern: "crosshatch",
    layout: "thumbRows",
    hero: "banner",
    radius: "0.85rem",
  },
  {
    id: 4,
    name: "أنيق مينيمال",
    scheme: "light",
    bg: "#f6f5f2",
    surface: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    text: "#222222",
    muted: "rgba(0,0,0,0.5)",
    headingFont: "var(--font-display-4)", // Reem Kufi
    pattern: "none",
    layout: "leaderList",
    hero: "none",
    radius: "0.75rem",
  },
  {
    id: 5,
    name: "جريء داكن",
    scheme: "dark",
    bg: "linear-gradient(160deg,#10241d 0%,#0b1a14 55%,#071310 100%)",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    text: "#ecfdf5",
    muted: "rgba(236,253,245,0.6)",
    headingFont: "var(--font-display-2)", // Rakkas
    pattern: "grid",
    layout: "photoCards",
    hero: "banner",
    radius: "1.1rem",
  },
];

export function resolveDesign(index?: number | null): MenuDesign {
  const n = MENU_DESIGNS.length;
  if (typeof index !== "number" || isNaN(index)) return MENU_DESIGNS[0];
  return MENU_DESIGNS[((index % n) + n) % n];
}

export function randomDesignIndex(): number {
  return Math.floor(Math.random() * MENU_DESIGNS.length);
}

// نمط الزخرفة كـ CSS للطبقة الخلفية، مُلوّن بلون التمييز
export function patternStyle(kind: PatternKind, color: string): CSSProperties | null {
  switch (kind) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(${color} 1.3px, transparent 1.3px)`,
        backgroundSize: "18px 18px",
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 14px)`,
      };
    case "crosshatch":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 16px)`,
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: "26px 26px",
      };
    case "arabesque":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='${encodeURIComponent(
          color
        )}' stroke-width='1'/%3E%3Ccircle cx='20' cy='20' r='6' fill='none' stroke='${encodeURIComponent(
          color
        )}' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "40px 40px",
      };
    default:
      return null;
  }
}
