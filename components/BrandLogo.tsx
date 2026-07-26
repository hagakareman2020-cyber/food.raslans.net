// اللوجو العام لنظام «منيو الذكي» — علامة متجهة (SVG) تصلح للمطاعم والكافيهات
// fork + coffee cup = طعام ومشروبات، مع لمسة «ذكي» (sparkle)

export const BRAND_NAME = "منيو الذكي";
export const BRAND_NAME_EN = "Smart Menu";

export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={BRAND_NAME}
    >
      <defs>
        <linearGradient id="smBrandGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
      </defs>

      {/* الخلفية */}
      <rect width="48" height="48" rx="13" fill="url(#smBrandGrad)" />

      {/* شوكة (يسار) */}
      <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <path d="M13 11v7" />
        <path d="M16 11v7" />
        <path d="M14.5 18v19" />
      </g>

      {/* كوب/فنجان (يمين) */}
      <path
        d="M22 21h13v4a6.5 6.5 0 0 1-6.5 6.5h0A6.5 6.5 0 0 1 22 25v-4Z"
        fill="#fff"
      />
      <path
        d="M35 22.5h1.6a3 3 0 0 1 0 6H35"
        stroke="#fff"
        strokeWidth="2.1"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M23 35.5h11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />

      {/* بخار = لمسة «ذكي» */}
      <path
        d="M26.5 13c-1.2 1.1-1.2 2.4 0 3.5M30.5 12.5c-1.2 1.1-1.2 2.4 0 3.5"
        stroke="#fde68a"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// اللوجو الكامل: العلامة + الاسم
export default function BrandLogo({
  size = 40,
  showText = true,
  textClassName = "",
  subtitle = false,
  className = "",
}: {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  subtitle?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className={`font-extrabold ${textClassName}`}>{BRAND_NAME}</span>
          {subtitle && (
            <span className="text-[11px] font-semibold tracking-wide text-brand/70">
              {BRAND_NAME_EN}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
