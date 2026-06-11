// Génère le QR code Toupré (pour affiches/flyers) vers l'URL passée en argument.
// Usage : node scripts/make-qr.js https://toupre.vercel.app
// Sortie : ../docs/qr-toupre.png (1024×1024, anthracite sur crème, pin corail au centre)
const { chromium } = require("@playwright/test");
const path = require("path");

const url = process.argv[2];
if (!url) { console.error("Usage : node scripts/make-qr.js <url>"); process.exit(1); }

const PIN = `<svg width="190" height="190" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="23" fill="#FFF8F3"/><path d="M24 3.5C14.6 3.5 7 11 7 20.2c0 6.7 4.3 12.6 8.6 17 2.7 2.8 5.5 5.1 7.3 6.6.6.5 1.6.5 2.2 0 1.8-1.5 4.6-3.8 7.3-6.6 4.3-4.4 8.6-10.3 8.6-17C41 11 33.4 3.5 24 3.5Z" fill="#E2674A"/><path d="M14.5 22.5 24 13.8l9.5 8.7" stroke="#FFF8F3" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="26.5" r="3.4" fill="#FFF8F3"/></svg>`;

const html = `<!doctype html><html><body style="margin:0;background:#FFF8F3">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<div style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;position:relative">
  <div id="qr"></div>
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">${PIN}</div>
</div>
<script>
new QRCode(document.getElementById("qr"), {
  text: ${JSON.stringify(url)},
  width: 860, height: 860,
  colorDark: "#2B2420", colorLight: "#FFF8F3",
  correctLevel: QRCode.CorrectLevel.H
});
<\/script></body></html>`;

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.setContent(html);
  await p.waitForTimeout(1200);
  const out = path.join(__dirname, "..", "..", "docs", "qr-toupre.png");
  await p.screenshot({ path: out });
  await b.close();
  console.log("✓ QR généré →", out, "(cible :", url + ")");
})();
