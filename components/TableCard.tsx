"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { deleteTable } from "@/lib/actions/tables";

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function TableCard({
  id,
  tableNumber,
  url,
  restaurantName,
  logoUrl,
}: {
  id: string;
  tableNumber: number;
  url: string;
  restaurantName: string;
  logoUrl?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 640, H = 900;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // تحميل كل الموارد أولاً (قبل أي رسم) لتفادي الرسم المزدوج
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {}
      const logo = logoUrl ? await loadImage(logoUrl) : null;
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, url, {
        width: 400,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#1a1410", light: "#ffffff" },
      });
      if (cancelled) return; // لا نرسم إن أُلغيَ التأثير

      // ===== الرسم (متزامن، مرة واحدة) =====
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#e5e0d8";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(10, 10, W - 20, 14);

      ctx.direction = "rtl";
      ctx.textAlign = "center";

      // اللوجو أعلى البطاقة
      const cx = W / 2;
      if (logo) {
        const s = 120;
        const ly = 50;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, ly + s / 2, s / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, cx - s / 2, ly, s, s);
        ctx.restore();
      }

      // اسم المطعم
      ctx.fillStyle = "#1a1410";
      ctx.font = "bold 44px 'Segoe UI', Tahoma, Arial, sans-serif";
      ctx.fillText(restaurantName, cx, 220);

      // شارة رقم الترابيزة
      ctx.font = "bold 34px 'Segoe UI', Tahoma, Arial, sans-serif";
      const label = `ترابيزة رقم ${tableNumber}`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "#fef2ec";
      roundRect(ctx, cx - tw / 2 - 24, 245, tw + 48, 52, 26);
      ctx.fill();
      ctx.fillStyle = "#c2410c";
      ctx.fillText(label, cx, 281);

      // كود QR
      const qs = 400;
      const qx = (W - qs) / 2;
      const qy = 330;
      ctx.drawImage(qrCanvas, qx, qy, qs, qs);

      // اللوجو داخل مركز الكود
      if (logo) {
        const ls = 82;
        const mcx = cx;
        const mcy = qy + qs / 2;
        ctx.fillStyle = "#ffffff";
        roundRect(ctx, mcx - ls / 2 - 8, mcy - ls / 2 - 8, ls + 16, ls + 16, 12);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(mcx, mcy, ls / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, mcx - ls / 2, mcy - ls / 2, ls, ls);
        ctx.restore();
      }

      // تذييل
      ctx.fillStyle = "#6b6157";
      ctx.font = "26px 'Segoe UI', Tahoma, Arial, sans-serif";
      ctx.fillText("امسح الكود لعرض المنيو والطلب", cx, qy + qs + 55);

      setDataUrl(canvas.toDataURL("image/png"));
    })();
    return () => {
      cancelled = true;
    };
  }, [url, restaurantName, logoUrl, tableNumber]);

  function downloadPng() {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ترابيزة-${tableNumber}.png`;
    a.click();
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "px", format: [640, 900] });
    doc.addImage(dataUrl, "PNG", 0, 0, 640, 900);
    doc.save(`ترابيزة-${tableNumber}.pdf`);
  }

  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<img src="${dataUrl}" style="width:100%" onload="window.print();window.close()"/>`
    );
    w.document.close();
  }

  return (
    <div className="rounded-2xl border border-black/10 p-4 bg-white flex flex-col items-center">
      <canvas ref={canvasRef} className="w-full max-w-[240px] rounded-lg border border-black/5" />
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        <button onClick={downloadPdf} disabled={!dataUrl} className="text-xs rounded-lg bg-brand text-white px-3 py-1.5 hover:bg-brand-dark disabled:opacity-50">
          PDF
        </button>
        <button onClick={downloadPng} disabled={!dataUrl} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-black/5 disabled:opacity-50">
          صورة
        </button>
        <button onClick={print} disabled={!dataUrl} className="text-xs rounded-lg border px-3 py-1.5 hover:bg-black/5 disabled:opacity-50">
          طباعة
        </button>
        <form action={deleteTable}>
          <input type="hidden" name="id" value={id} />
          <button className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50">
            حذف
          </button>
        </form>
      </div>
    </div>
  );
}
