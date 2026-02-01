import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const doc = await db.collection("analyses").findOne({ _id: new ObjectId(id) });
    if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({
      _id: doc._id.toString(),
      startup_name: doc.startup_name,
      startup_url: doc.startup_url,
      startup_summary: doc.startup_summary,
      analyzed_at: doc.analyzed_at,
      competitors: doc.competitors || [],
      market_intelligence: doc.market_intelligence || [],
      recommendations: doc.recommendations || [],
    });
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
