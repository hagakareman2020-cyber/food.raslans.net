"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon: string;
  section?: string; // القسم المطلوب للوصول
  always?: boolean; // متاح للجميع
  ownerOnly?: boolean;
};

const items: Item[] = [
  { href: "/dashboard", label: "نظرة عامة", icon: "🏠", always: true },
  { href: "/dashboard/menu", label: "المنيو", icon: "🍔", section: "menu" },
  { href: "/dashboard/generate", label: "توليد المنيو (AI)", icon: "✨", section: "menu" },
  { href: "/dashboard/pos", label: "الكاشير (POS)", icon: "🧾", section: "pos" },
  { href: "/dashboard/tables", label: "الترابيزات و QR", icon: "🔳", section: "tables" },
  { href: "/dashboard/kitchen", label: "المطبخ", icon: "👨‍🍳", section: "kitchen" },
  { href: "/dashboard/analytics", label: "المحاسبة والتحليل", icon: "📊", section: "analytics" },
  { href: "/dashboard/inventory", label: "المخزون", icon: "📦", section: "inventory" },
  { href: "/dashboard/branches", label: "الفروع", icon: "🏬", ownerOnly: true },
  { href: "/dashboard/staff", label: "الموظفون", icon: "👥", ownerOnly: true },
  { href: "/dashboard/settings", label: "الإعدادات", icon: "⚙️", ownerOnly: true },
];

export default function Sidebar({
  sections,
  isOwner,
}: {
  sections: string[];
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const allowed = new Set(sections);

  const visible = items.filter((it) => {
    if (it.always) return true;
    if (it.ownerOnly) return isOwner;
    if (it.section) return isOwner || allowed.has(it.section);
    return false;
  });

  return (
    <nav className="flex flex-col gap-1 p-3">
      {visible.map((it) => {
        const active = pathname === it.href;
        const cls = active
          ? "bg-brand text-white"
          : "hover:bg-black/5 text-black/80";
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${cls}`}
          >
            <span>{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
