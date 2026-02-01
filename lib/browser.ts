import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

const CHROMIUM_PACK =
  "https://github.com/nichochar/chromium-headless/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";

export async function generatePdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteerCore.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(CHROMIUM_PACK),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  });
  await browser.close();
  return Buffer.from(pdf);
}
