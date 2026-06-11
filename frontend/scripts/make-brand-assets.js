// Génère les icônes/splash Toupré (PNG) depuis le mark SVG, via le Chrome installé.
// Usage : node scripts/make-brand-assets.js
const { chromium } = require("@playwright/test");
const path = require("path");

const CORAIL = "#E2674A";
const CREME = "#FFF8F3";

// Même géométrie que src/Brand.tsx (ToupreMark)
function markSvg(pin, detail, px) {
  return `<svg width="${px}" height="${px}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 3.5C14.6 3.5 7 11 7 20.2c0 6.7 4.3 12.6 8.6 17 2.7 2.8 5.5 5.1 7.3 6.6.6.5 1.6.5 2.2 0 1.8-1.5 4.6-3.8 7.3-6.6 4.3-4.4 8.6-10.3 8.6-17C41 11 33.4 3.5 24 3.5Z" fill="${pin}"/>
    <path d="M14.5 22.5 24 13.8l9.5 8.7" stroke="${detail}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="26.5" r="3.4" fill="${detail}"/>
  </svg>`;
}

function page(bg, inner) {
  return `<!doctype html><html><body style="margin:0;${bg ? `background:${bg};` : ""}">
    <div style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;">${inner}</div>
  </body></html>`;
}

const ASSETS = [
  // Icône iOS/stores : fond corail plein (pas de transparence), mark crème
  { file: "icon.png", size: 1024, transparent: false,
    html: page(CORAIL, markSvg(CREME, CORAIL, 660)) },
  // Adaptive icon Android : mark crème seul, transparent, dans la zone sûre (~58%)
  { file: "adaptive-icon.png", size: 1024, transparent: true,
    html: page(null, markSvg(CREME, CORAIL, 600)) },
  // Logo de splash : mark corail, transparent (fond crème via app.json)
  { file: "splash-icon.png", size: 1024, transparent: true,
    html: page(null, markSvg(CORAIL, CREME, 512)) },
  // Favicon web
  { file: "favicon.png", size: 196, transparent: true,
    html: page(null, markSvg(CORAIL, CREME, 180)) },
];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const a of ASSETS) {
    const ctx = await browser.newContext({
      viewport: { width: a.size, height: a.size },
      deviceScaleFactor: 1,
    });
    const p = await ctx.newPage();
    await p.setContent(a.html);
    const out = path.join(__dirname, "..", "assets", "images", a.file);
    await p.screenshot({ path: out, omitBackground: a.transparent });
    console.log("✓", a.file, a.size + "px");
    await ctx.close();
  }
  await browser.close();
})();
