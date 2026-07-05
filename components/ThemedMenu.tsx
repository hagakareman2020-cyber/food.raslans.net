"use client";

import { useEffect, useMemo, useState } from "react";
import { TAG_LABELS, type ProductTag } from "@/lib/types";
import { resolveDesign, patternStyle, type MenuDesign } from "@/lib/menuDesigns";

export type ThemedMenuItem = {
  name_ar: string;
  name_en?: string;
  emoji?: string;
  image_url?: string | null;
  description_ar?: string;
  ingredients?: string;
  suggested_price?: number;
  prep_minutes?: number;
  tags?: ProductTag[];
};

export type ThemedMenuContent = {
  title?: string;
  description?: string;
  theme?: {
    cuisine?: string;
    emoji?: string;
    primary?: string;
    accent?: string;
    mood?: string;
    hero_image?: string | null;
  };
  design?: { template: number };
  categories?: {
    name_ar: string;
    name_en?: string;
    emoji?: string;
    items?: ThemedMenuItem[];
  }[];
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function safeHex(v: string | undefined | null, fallback: string) {
  return v && HEX.test(v.trim()) ? v.trim() : fallback;
}
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba([r, g, b]: [number, number, number], a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

function useLogoColor(logoUrl?: string | null) {
  const [color, setColor] = useState<string | null>(null);
  useEffect(() => {
    if (!logoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 40;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3];
          if (A < 128) continue;
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          if (max - min < 40 || max < 50 || min > 220) continue;
          r += R; g += G; b += B; count++;
        }
        if (count > 0)
          setColor(`#${[r, g, b].map((c) => Math.round(c / count).toString(16).padStart(2, "0")).join("")}`);
      } catch {
        /* CORS */
      }
    };
    img.src = logoUrl;
  }, [logoUrl]);
  return color;
}

export default function ThemedMenu({
  content,
  restaurantName,
  logoUrl,
  currency,
}: {
  content: ThemedMenuContent;
  restaurantName: string;
  logoUrl?: string | null;
  currency: string;
}) {
  const logoColor = useLogoColor(logoUrl);
  const theme = content.theme ?? {};
  const design = resolveDesign(content.design?.template);

  const accent = safeHex(
    logoColor ?? theme.accent ?? theme.primary,
    design.scheme === "dark" ? "#f2b705" : "#c2410c"
  );
  const aRgb = useMemo(() => hexToRgb(accent), [accent]);
  const cuisineEmoji = theme.emoji || "🍽️";
  const heroImage = theme.hero_image;
  const pattern = patternStyle(design.pattern, rgba(aRgb, design.scheme === "dark" ? 0.12 : 0.07));

  return (
    <div
      className="relative overflow-hidden shadow-2xl"
      style={{
        background: design.bg,
        color: design.text,
        borderRadius: "1.5rem",
        border: `1px solid ${design.border}`,
        fontFamily: "var(--font-cairo)",
      }}
    >
      {/* طبقة النقوش */}
      {pattern && (
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={pattern} />
      )}

      {/* الهيدر */}
      <Hero
        design={design}
        accent={accent}
        aRgb={aRgb}
        title={content.title || restaurantName}
        description={content.description}
        cuisine={theme.cuisine}
        cuisineEmoji={cuisineEmoji}
        logoUrl={logoUrl}
        heroImage={heroImage}
        restaurantName={restaurantName}
      />

      {/* الأقسام */}
      <div
        className={
          "relative px-5 sm:px-8 pb-10 pt-4 gap-8 " +
          (design.layout === "photoCards" ? "grid md:grid-cols-2" : "grid md:grid-cols-2")
        }
      >
        {(content.categories ?? []).map((cat, i) => (
          <section key={i} className={design.layout === "photoCards" ? "md:col-span-1" : ""}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{cat.emoji || "🍴"}</span>
              <h3 className="text-2xl" style={{ fontFamily: design.headingFont, color: accent }}>
                {cat.name_ar}
              </h3>
              {cat.name_en && (
                <span className="text-[11px] tracking-widest uppercase" style={{ color: design.muted }}>
                  {cat.name_en}
                </span>
              )}
              <div className="flex-1 h-px" style={{ background: rgba(aRgb, 0.25) }} />
            </div>

            {design.layout === "photoCards" ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {(cat.items ?? []).map((it, j) => (
                  <PhotoCard key={j} it={it} design={design} accent={accent} aRgb={aRgb} currency={currency} />
                ))}
              </div>
            ) : design.layout === "thumbRows" ? (
              <div className="space-y-3">
                {(cat.items ?? []).map((it, j) => (
                  <ThumbRow key={j} it={it} design={design} accent={accent} aRgb={aRgb} currency={currency} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(cat.items ?? []).map((it, j) => (
                  <LeaderRow key={j} it={it} design={design} accent={accent} aRgb={aRgb} currency={currency} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* فوتر */}
      <div
        className="relative px-8 py-5 text-center text-xs"
        style={{ borderTop: `1px solid ${rgba(aRgb, 0.2)}`, color: design.muted }}
      >
        {restaurantName}
        {theme.cuisine ? ` · ${theme.cuisine}` : ""}
      </div>
    </div>
  );
}

/* ============ الهيدر ============ */
function Hero(props: {
  design: MenuDesign;
  accent: string;
  aRgb: [number, number, number];
  title: string;
  description?: string;
  cuisine?: string;
  cuisineEmoji: string;
  logoUrl?: string | null;
  heroImage?: string | null;
  restaurantName: string;
}) {
  const { design, accent, title, description, cuisine, cuisineEmoji, logoUrl, heroImage, restaurantName } = props;

  if (design.hero === "banner" && heroImage) {
    return (
      <div className="relative h-56 sm:h-64 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.65))" }} />
        <div className="relative h-full flex flex-col items-center justify-end text-center pb-6 px-4 text-white">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-16 h-16 rounded-full object-cover mb-2 bg-white/10" style={{ border: `2px solid ${accent}` }} />
          )}
          <h2 className="text-4xl sm:text-5xl leading-tight" style={{ fontFamily: design.headingFont }}>
            {title}
          </h2>
          {cuisine && <span className="text-xs tracking-[0.35em] uppercase mt-1" style={{ color: accent }}>{cuisine}</span>}
        </div>
      </div>
    );
  }

  // circle أو none
  return (
    <div className="relative px-6 pt-9 pb-5 text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={restaurantName} className="w-20 h-20 rounded-full object-cover mx-auto shadow-lg" style={{ border: `2px solid ${accent}` }} />
      ) : (
        <div className="w-20 h-20 rounded-full mx-auto grid place-items-center text-4xl" style={{ background: rgba(props.aRgb, 0.12) }}>
          {cuisineEmoji}
        </div>
      )}
      {cuisine && (
        <div className="mt-3 text-xs tracking-[0.4em] uppercase" style={{ color: accent }}>{cuisine}</div>
      )}
      <h2 className="text-4xl sm:text-5xl leading-tight mt-1" style={{ fontFamily: design.headingFont, color: accent }}>
        {title}
      </h2>
      {description && <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: design.muted }}>{description}</p>}

      {design.hero === "circle" && heroImage && (
        <div className="mt-6 flex justify-center">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden shadow-2xl" style={{ border: `4px solid ${accent}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ تخطيطات العناصر ============ */
type RowProps = {
  it: ThemedMenuItem;
  design: MenuDesign;
  accent: string;
  aRgb: [number, number, number];
  currency: string;
};

function Tags({ it, accent, aRgb }: { it: ThemedMenuItem; accent: string; aRgb: [number, number, number] }) {
  return (
    <>
      {(it.tags ?? []).map((t) => (
        <span key={t} className="text-[10px] rounded px-1.5 py-0.5" style={{ background: rgba(aRgb, 0.15), color: accent }}>
          {TAG_LABELS[t] ?? t}
        </span>
      ))}
    </>
  );
}

function PhotoCard({ it, design, accent, aRgb, currency }: RowProps) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: design.surface, border: `1px solid ${design.border}` }}>
      <div className="h-28 w-full overflow-hidden" style={{ background: rgba(aRgb, 0.1) }}>
        {it.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-4xl">{it.emoji || "🍽️"}</div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold" style={{ color: design.text }}>{it.name_ar}</span>
          <span className="font-extrabold whitespace-nowrap" style={{ color: accent }}>{it.suggested_price ?? 0} {currency}</span>
        </div>
        {it.description_ar && <p className="text-xs mt-1 leading-relaxed" style={{ color: design.muted }}>{it.description_ar}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap"><Tags it={it} accent={accent} aRgb={aRgb} /></div>
      </div>
    </div>
  );
}

function ThumbRow({ it, design, accent, aRgb, currency }: RowProps) {
  return (
    <div className="flex items-start gap-3">
      {it.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-md" style={{ border: `1px solid ${design.border}` }} />
      ) : (
        <div className="w-16 h-16 rounded-xl shrink-0 grid place-items-center text-2xl" style={{ background: rgba(aRgb, 0.12) }}>
          {it.emoji || "🍽️"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold" style={{ color: design.text }}>{it.name_ar}</span>
          <span className="flex-1 mx-1 border-b border-dotted" style={{ borderColor: rgba(aRgb, 0.4) }} />
          <span className="font-extrabold whitespace-nowrap" style={{ color: accent }}>{it.suggested_price ?? 0} {currency}</span>
        </div>
        {it.description_ar && <p className="text-xs mt-1 leading-relaxed" style={{ color: design.muted }}>{it.description_ar}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px]" style={{ color: design.muted }}>⏱️ {it.prep_minutes ?? 10} دقيقة</span>
          <Tags it={it} accent={accent} aRgb={aRgb} />
        </div>
      </div>
    </div>
  );
}

function LeaderRow({ it, design, accent, aRgb, currency }: RowProps) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg">{it.emoji || "•"}</span>
        <span className="font-bold" style={{ color: design.text }}>{it.name_ar}</span>
        <span className="flex-1 mx-1 border-b border-dotted" style={{ borderColor: rgba(aRgb, 0.45) }} />
        <span className="font-extrabold whitespace-nowrap" style={{ color: accent }}>{it.suggested_price ?? 0} {currency}</span>
      </div>
      {it.description_ar && <p className="text-xs mt-1 mr-7 leading-relaxed" style={{ color: design.muted }}>{it.description_ar}</p>}
      <div className="flex items-center gap-2 mt-1 mr-7 flex-wrap"><Tags it={it} accent={accent} aRgb={aRgb} /></div>
    </div>
  );
}
