import sharp from "sharp";
import path from "node:path";
const RES = path.join(process.cwd(), "android/app/src/main/res");
const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#f97316"/><stop offset="1" stop-color="#9a3412"/></linearGradient>`;
const CONTENT = `
  <g stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M13 11v7"/><path d="M16 11v7"/><path d="M14.5 18v19"/></g>
  <path d="M22 21h13v4a6.5 6.5 0 0 1-6.5 6.5h0A6.5 6.5 0 0 1 22 25v-4Z" fill="#fff"/>
  <path d="M35 22.5h1.6a3 3 0 0 1 0 6H35" stroke="#fff" stroke-width="2.1" fill="none" stroke-linecap="round"/>
  <path d="M23 35.5h11" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M26.5 13c-1.2 1.1-1.2 2.4 0 3.5M30.5 12.5c-1.2 1.1-1.2 2.4 0 3.5" stroke="#fde68a" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
// أيقونة كاملة (خلفية متدرجة + محتوى)
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${GRAD}</defs><rect width="48" height="48" fill="url(#g)"/><g transform="translate(24,23.5) scale(0.82) translate(-24,-23.5)">${CONTENT}</g></svg>`;
// طبقة الواجهة للأيقونة التكيّفية: محتوى أبيض على شفاف (الخلفية = لون العلامة عبر @color)
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g transform="translate(24,23.5) scale(0.62) translate(-24,-23.5)">${CONTENT}</g></svg>`;
// خلفية العلامة (احتياطي لو استُخدم mipmap بدل @color)
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${GRAD}</defs><rect width="48" height="48" fill="url(#g)"/></svg>`;

const DENS = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const circleMask = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s/2}" cy="${s/2}" r="${s/2}" fill="#fff"/></svg>`);

for (const [d, s] of Object.entries(DENS)) {
  const dir = path.join(RES, "mipmap-" + d);
  await sharp(Buffer.from(fullBleed)).resize(s, s).png().toFile(path.join(dir, "ic_launcher.png"));
  await sharp(Buffer.from(fullBleed)).resize(s, s).composite([{ input: circleMask(s), blend: "dest-in" }]).png().toFile(path.join(dir, "ic_launcher_round.png"));
  await sharp(Buffer.from(foreground)).resize(s, s).png().toFile(path.join(dir, "ic_launcher_foreground.png"));
  await sharp(Buffer.from(background)).resize(s, s).png().toFile(path.join(dir, "ic_launcher_background.png"));
  console.log("mipmap-" + d, s + "px ✓");
}
console.log("android icons done");
