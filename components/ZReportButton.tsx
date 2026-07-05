"use client";

export default function ZReportButton({
  restaurantName,
  currency,
  sales,
  count,
}: {
  restaurantName: string;
  currency: string;
  sales: number;
  count: number;
}) {
  function print() {
    const w = window.open("", "_blank", "width=380,height=560");
    if (!w) return;
    const now = new Date().toLocaleString("ar-EG");
    const avg = count ? Math.round(sales / count) : 0;
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>Z-Report</title>
      <style>body{font-family:Tahoma,Arial;padding:16px;width:320px}h2{text-align:center;margin:2px}
      .line{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ccc;font-size:14px}
      .big{font-size:20px;font-weight:bold} .muted{text-align:center;color:#666;font-size:12px;margin-bottom:10px}</style></head>
      <body onload="window.print();window.close()">
      <h2>${restaurantName}</h2>
      <p class="muted">تقرير إغلاق اليوم (Z-Report)<br>${now}</p>
      <div class="line"><span>عدد الطلبات</span><span>${count}</span></div>
      <div class="line"><span>متوسط الطلب</span><span>${avg} ${currency}</span></div>
      <div class="line big"><span>إجمالي المبيعات</span><span>${sales} ${currency}</span></div>
      <p class="muted" style="margin-top:14px">— نهاية التقرير —</p>
      </body></html>`);
    w.document.close();
  }

  return (
    <button
      onClick={print}
      className="rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5"
    >
      🧾 طباعة تقرير اليوم (Z-Report)
    </button>
  );
}
