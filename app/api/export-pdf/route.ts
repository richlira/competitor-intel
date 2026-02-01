import { getDb } from "@/lib/mongodb";
import { generateReportHTML } from "@/lib/pdf-generator";
import { ObjectId } from "mongodb";
import puppeteer from "puppeteer";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) {
      return new Response("Missing analysisId", { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("analyses").findOne({ _id: new ObjectId(analysisId) });
    if (!doc) {
      return new Response("Analysis not found", { status: 404 });
    }

    const html = generateReportHTML({
      startup_name: doc.startup_name,
      startup_url: doc.startup_url,
      analyzed_at: doc.analyzed_at,
      competitors: doc.competitors || [],
      market_intelligence: doc.market_intelligence || [],
      recommendations: doc.recommendations || [],
    });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" } });
    await browser.close();

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="competitor-intel-${doc.startup_name}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
