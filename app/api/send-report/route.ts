import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { getDb } from "@/lib/mongodb";
import { buildEmailHtml } from "@/lib/pipeline";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { email, analysisId } = await req.json();

  if (!email || !analysisId) {
    return Response.json({ error: "Missing email or analysisId" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection("analyses").findOne({ _id: new ObjectId(analysisId) });

  if (!doc) {
    return Response.json({ error: "Analysis not found" }, { status: 404 });
  }

  const startup = { name: doc.startup_name, product: doc.startup_summary };
  const analysis = {
    competitors: doc.competitors,
    marketIntelligence: doc.market_intelligence,
    recommendations: doc.recommendations,
  };

  const html = buildEmailHtml(startup, analysis);
  const htmlBuffer = Buffer.from(html, "utf-8");

  await resend.emails.send({
    from: "Competitor Intel <onboarding@resend.dev>",
    to: email,
    subject: `Competitor Intel: ${startup.name} vs ${analysis.competitors.length} Competitors`,
    html,
    attachments: [
      {
        filename: `competitor-intel-${startup.name.toLowerCase().replace(/\s+/g, "-")}.html`,
        content: htmlBuffer,
      },
    ],
  });

  await db.collection("analyses").updateOne(
    { _id: new ObjectId(analysisId) },
    { $set: { report_sent: true, user_email: email } }
  );

  return Response.json({ success: true });
}
