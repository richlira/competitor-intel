import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const analyses = await db
      .collection("analyses")
      .find({}, { projection: { startup_name: 1, analyzed_at: 1 } })
      .sort({ analyzed_at: -1 })
      .limit(20)
      .toArray();

    const items = analyses.map(a => ({
      _id: a._id.toString(),
      startup_name: a.startup_name || "Unknown",
      analyzed_at: a.analyzed_at,
    }));

    return Response.json(items);
  } catch {
    return Response.json([]);
  }
}

export async function DELETE() {
  try {
    const db = await getDb();
    await db.collection("analyses").deleteMany({});
    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false }, { status: 500 });
  }
}
