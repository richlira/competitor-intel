import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { getDb } from "@/lib/mongodb";
import { buildEmailHtml } from "@/lib/pipeline";
import { generatePdfBuffer } from "@/lib/browser";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
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

  const emailHtml = buildEmailHtml(startup, analysis);
  const slug = startup.name.toLowerCase().replace(/\s+/g, "-");

  // Generate PDF using jsPDF (pure JS, no browser needed)
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = generatePdfBuffer({
      startup_name: doc.startup_name,
      startup_url: doc.startup_url,
      analyzed_at: doc.analyzed_at,
      competitors: doc.competitors || [],
      market_intelligence: doc.market_intelligence || [],
      recommendations: doc.recommendations || [],
    });
  } catch (err) {
    console.error("PDF generation for email failed:", err);
  }

  const attachments: { filename: string; content: Buffer }[] = [];
  if (pdfBuffer) {
    attachments.push({ filename: `competitor-intel-${slug}.pdf`, content: pdfBuffer });
  }
  attachments.push({
    filename: `competitor-intel-${slug}.html`,
    content: Buffer.from(emailHtml, "utf-8"),
  });

  await resend.emails.send({
    from: "Competitor Intel <onboarding@resend.dev>",
    to: email,
    subject: `Competitor Intel: ${startup.name} vs ${analysis.competitors.length} Competitors`,
    html: emailHtml,
    attachments,
  });

  await db.collection("analyses").updateOne(
    { _id: new ObjectId(analysisId) },
    { $set: { report_sent: true, user_email: email } }
  );

  return Response.json({ success: true });
}
