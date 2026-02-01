import { getDb } from "@/lib/mongodb";
import { generateReportHTML } from "@/lib/pdf-generator";
import { ObjectId } from "mongodb";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

export const maxDuration = 60;

async function getBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteerCore.launch({
    channel: "chrome",
    headless: true,
  });
}

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) {
      return new Response(JSON.stringify({ error: "Missing analysisId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    const doc = await db.collection("analyses").findOne({ _id: new ObjectId(analysisId) });
    if (!doc) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const html = generateReportHTML({
      startup_name: doc.startup_name,
      startup_url: doc.startup_url,
      analyzed_at: doc.analyzed_at,
      competitors: doc.competitors || [],
      market_intelligence: doc.market_intelligence || [],
      recommendations: doc.recommendations || [],
    });

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    await browser.close();

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="competitor-intel-${doc.startup_name}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
