import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, process.argv[2] ?? "plan-cfdigital.html");
const pdfPath = resolve(__dirname, process.argv[3] ?? "plan-cfdigital.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  margin: { top: "16px", bottom: "16px", left: "16px", right: "16px" },
  printBackground: true
});
await browser.close();
console.log("PDF generado en " + pdfPath);
