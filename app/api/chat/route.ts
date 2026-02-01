import { getDb } from "@/lib/mongodb";
import { ask } from "@/lib/anthropic";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { message, analysisId } = await req.json();
    if (!message || !analysisId) {
      return Response.json({ response: "Missing message or analysisId" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("analyses").findOne({ _id: new ObjectId(analysisId) });
    if (!doc) {
      return Response.json({ response: "Analysis not found" }, { status: 404 });
    }

    const report = {
      startup: doc.startup_name,
      competitors: doc.competitors,
      market_intelligence: doc.market_intelligence,
      recommendations: doc.recommendations,
    };

    const response = await ask(
      message,
      `You are a competitive intelligence analyst. You have this report:\n${JSON.stringify(report, null, 2)}\n\nAnswer questions about the competitors, market, and recommendations. Be concise and specific. Use data from the report.`
    );

    return Response.json({ response });
  } catch (err) {
    return Response.json(
      { response: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
