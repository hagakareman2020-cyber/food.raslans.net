"use client";

import { useState } from "react";
import PosTerminal from "@/components/PosTerminal";
import CashierOrders from "@/components/CashierOrders";
import type { Category, Product, OrderStatus } from "@/lib/types";

type Order = {
  id: string;
  table_number: number | null;
  status: OrderStatus;
  total: number;
  note: string | null;
  session_id: string | null;
  created_at: string;
  order_items: { id: string; name_ar: string; price: number; quantity: number; is_free: boolean }[];
};

export default function PosScreen({
  restaurantId,
  restaurantName,
  currency,
  categories,
  products,
  tableNumbers,
  initialOrders,
}: {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  categories: Category[];
  products: Product[];
  tableNumbers: number[];
  initialOrders: Order[];
}) {
  const [tab, setTab] = useState<"sell" | "orders">("sell");
  const openCount = initialOrders.length;

  return (
    <div>
      {/* شريط التبويب */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <button
          onClick={() => setTab("sell")}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${
            tab === "sell" ? "bg-brand text-white" : "bg-black/5 hover:bg-black/10"
          }`}
        >
          🧾 بيع جديد
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`rounded-full px-5 py-2 text-sm font-bold transition flex items-center gap-2 ${
            tab === "orders" ? "bg-brand text-white" : "bg-black/5 hover:bg-black/10"
          }`}
        >
          📱 طلبات العملاء
          {openCount > 0 && (
            <span className={`rounded-full text-xs px-2 ${tab === "orders" ? "bg-white/25" : "bg-brand text-white"}`}>
              {openCount}
            </span>
          )}
        </button>
      </div>

      {tab === "sell" ? (
        <PosTerminal
          restaurantName={restaurantName}
          currency={currency}
          categories={categories}
          products={products}
          tableNumbers={tableNumbers}
        />
      ) : (
        <div className="p-5">
          <h1 className="text-2xl font-bold mb-1">طلبات العملاء</h1>
          <p className="text-black/60 mb-4 text-sm">
            الطلبات القادمة من العملاء عبر كود QR تصل هنا تلقائياً — أصدر الفاتورة بضغطة واحدة.
          </p>
          <CashierOrders
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            currency={currency}
            initialOrders={initialOrders}
          />
        </div>
      )}
    </div>
  );
}
