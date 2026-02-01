import { getDb } from "@/lib/mongodb";
import { generateReportHTML } from "@/lib/pdf-generator";
import { ObjectId } from "mongodb";

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

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate report" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
