// Captures dashboard + detail screenshots into ./demo for review.
// Run: node --env-file=.env scripts/screenshot.mjs
import crypto from "node:crypto";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";

function sessionToken() {
  const secret = process.env.SESSION_SECRET;
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ sub: "reviewer", exp })).toString(
    "base64url",
  );
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});
await context.addCookies([
  {
    name: "bic_session",
    value: sessionToken(),
    domain: "localhost",
    path: "/",
  },
]);

const page = await context.newPage();

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: "demo/dashboard.png" });

const href = await page.getAttribute("tbody tr a", "href");
if (href) {
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "demo/detail.png", fullPage: true });
}

await browser.close();
console.log("Saved demo/dashboard.png" + (href ? " and demo/detail.png" : ""));
