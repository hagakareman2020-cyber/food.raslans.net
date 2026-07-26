// توليد أيقونات النظام (PNG + favicon.ico) من علامة «منيو الذكي»
// شغّله بعد أي تعديل على اللوجو:  node gen-icons.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUB = path.join(ROOT, "public");

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#f97316"/><stop offset="1" stop-color="#9a3412"/></linearGradient>`;

// الشوكة + الفنجان + البخار (نفس علامة components/BrandLogo.tsx)
const CONTENT = `
  <g stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M13 11v7"/><path d="M16 11v7"/><path d="M14.5 18v19"/></g>
  <path d="M22 21h13v4a6.5 6.5 0 0 1-6.5 6.5h0A6.5 6.5 0 0 1 22 25v-4Z" fill="#fff"/>
  <path d="M35 22.5h1.6a3 3 0 0 1 0 6H35" stroke="#fff" stroke-width="2.1" fill="none" stroke-linecap="round"/>
  <path d="M23 35.5h11" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M26.5 13c-1.2 1.1-1.2 2.4 0 3.5M30.5 12.5c-1.2 1.1-1.2 2.4 0 3.5" stroke="#fde68a" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;

// ملء-الإطار: خلفية كاملة + محتوى داخل المنطقة الآمنة (لأيقونات maskable/الهاتف)
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${GRAD}</defs><rect width="48" height="48" fill="url(#g)"/><g transform="translate(24,23.5) scale(0.78) translate(-24,-23.5)">${CONTENT}</g></svg>`;
// بادج بحواف دائرية وخلفية شفافة (للّوجو داخل الواجهة)
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${GRAD}</defs><rect width="48" height="48" rx="13" fill="url(#g)"/>${CONTENT}</svg>`;
// نسخة للـ favicon الصغير: تكبير المحتوى قليلاً ليظل واضحاً عند 16px
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${GRAD}</defs><rect width="48" height="48" fill="url(#g)"/><g transform="translate(24,23.5) scale(0.86) translate(-24,-23.5)">${CONTENT}</g></svg>`;

// PNGs
for (const [svg, size, name] of [
  [fullBleed, 192, "icon-192.png"],
  [fullBleed, 512, "icon-512.png"],
  [fullBleed, 180, "apple-touch-icon.png"],
  [badge, 512, "logo.png"],
]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(PUB, name));
  console.log("wrote public/" + name, size + "px");
}

// favicon.ico متعدد المقاسات (بـ PNG مضمّن)
const icoSizes = [16, 32, 48];
const parts = [];
for (const s of icoSizes) parts.push({ s, buf: await sharp(Buffer.from(faviconSvg)).resize(s, s).png().toBuffer() });
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(parts.length, 4);
let offset = 6 + parts.length * 16;
const entries = parts.map((p) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(p.s, 0); e.writeUInt8(p.s, 1);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(p.buf.length, 8); e.writeUInt32LE(offset, 12);
  offset += p.buf.length;
  return e;
});
const ico = Buffer.concat([header, ...entries, ...parts.map((p) => p.buf)]);
for (const dest of ["app/favicon.ico", "public/favicon.ico"]) {
  fs.writeFileSync(path.join(ROOT, dest), ico);
  console.log("wrote " + dest, ico.length + " bytes");
}
console.log("done");
