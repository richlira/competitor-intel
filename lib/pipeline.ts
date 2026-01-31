import FirecrawlApp from "@mendable/firecrawl-js";
import { Resend } from "resend";
import { ask } from "./anthropic";
import { getDb } from "./mongodb";
import { parsePdf } from "./reducto";

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);

type Emit = (step: string, detail?: string, data?: Record<string, unknown>) => void;

interface CompetitorInfo {
  name: string;
  url: string;
  pricing: string;
  recentMoves: string;
  hiringSignals: string;
  keyDifferentiator: string;
  threatLevel: string;
  summary: string;
}

export async function runPipeline(
  startupUrl: string,
  email: string,
  emit: Emit
) {
  // 1. Scrape startup
  emit("scraping", `Scraping ${startupUrl}...`);
  const scrapeResult = await firecrawl.scrape(startupUrl, {
    formats: ["markdown"],
  });
  const startupContent = scrapeResult.markdown?.slice(0, 8000) || "";
  if (!startupContent) throw new Error("Failed to scrape startup URL");

  // 2. Extract startup info
  emit("extracting", "Analyzing startup...");
  const extractionRaw = await ask(
    `Analyze this startup website content and return ONLY valid JSON (no markdown):
{
  "name": "company name",
  "product": "what they do in 1-2 sentences",
  "industry": "industry/category",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "targetMarket": "who they sell to"
}

Website content:
${startupContent}`
  );
  const extraction = JSON.parse(extractionRaw.replace(/```json?\n?|\n?```/g, ""));
  emit("startup_info", `Identified: ${extraction.name}`, { startup: extraction });

  // 3. Search for competitors
  emit("searching", `Finding competitors for ${extraction.name}...`);
  const queries = [
    `${extraction.name} alternatives`,
    `${extraction.name} vs competitors`,
    `${extraction.product} competitors ${extraction.industry}`,
  ];
  const searchResults = await Promise.all(
    queries.map((q) =>
      firecrawl.search(q, { limit: 5 }).catch(() => ({ web: [] } as any))
    )
  );
  const allResults = searchResults
    .flatMap((r: any) => r.web || r.data || [])
    .map((r: any) => ({ title: r.title || "", url: r.url || "", description: r.description || "" }));

  // 4. Rank competitors
  emit("ranking", "Ranking top competitors...");
  const rankingRaw = await ask(
    `Given this startup: ${extraction.name} - ${extraction.product}

Here are search results for competitors:
${JSON.stringify(allResults, null, 2)}

Return ONLY valid JSON array of the top 5 most relevant COMPETITORS (not the startup itself, not review sites like G2/Capterra). Each entry: {"name": "...", "url": "..."}
Exclude ${extraction.name} itself and any non-competitor URLs (blogs, review aggregators, news articles).`
  );
  const topCompetitors: { name: string; url: string }[] = JSON.parse(
    rankingRaw.replace(/```json?\n?|\n?```/g, "")
  );
  emit("competitors_found", `Found ${topCompetitors.length} competitors`, { competitors: topCompetitors });

  // 5. Deep scrape competitors
  emit("deep_scraping", `Deep scraping ${topCompetitors.length} competitors...`);
  const competitorData = await Promise.all(
    topCompetitors.slice(0, 5).map(async (comp) => {
      emit("competitor_scraping", `Scraping ${comp.name}...`, { name: comp.name });
      const pages = await Promise.all([
        firecrawl.scrape(comp.url, { formats: ["markdown"] }).catch(() => null),
        firecrawl.scrape(`${comp.url}/pricing`, { formats: ["markdown"] }).catch(() => null),
        firecrawl.scrape(`${comp.url}/about`, { formats: ["markdown"] }).catch(() => null),
        firecrawl.scrape(`${comp.url}/careers`, { formats: ["markdown"] }).catch(() => null),
      ]);

      // Look for PDF links in scraped content
      let pdfContent = "";
      for (const page of pages) {
        if (!page?.markdown) continue;
        const pdfUrls = page.markdown.match(/https?:\/\/[^\s)]+\.pdf/gi) || [];
        for (const pdfUrl of pdfUrls.slice(0, 1)) {
          const parsed = await parsePdf(pdfUrl);
          if (parsed) pdfContent += parsed.slice(0, 2000);
        }
      }

      emit("competitor_done", `${comp.name} scraped`, { name: comp.name });

      return {
        name: comp.name,
        url: comp.url,
        homepage: (pages[0] as any)?.markdown?.slice(0, 3000) || "",
        pricing: (pages[1] as any)?.markdown?.slice(0, 2000) || "",
        about: (pages[2] as any)?.markdown?.slice(0, 2000) || "",
        careers: (pages[3] as any)?.markdown?.slice(0, 2000) || "",
        pdfContent,
      };
    })
  );

  // 6. Analyze competitors
  emit("analyzing", "Generating competitive analysis...");
  const analysisRaw = await ask(
    `You are a competitive intelligence analyst. Analyze these competitors against ${extraction.name} (${extraction.product}).

For each competitor, provide detailed analysis. Return ONLY valid JSON:
{
  "competitors": [
    {
      "name": "...",
      "url": "...",
      "summary": "what they do",
      "pricing": "pricing breakdown",
      "recentMoves": "recent activity from blog/news",
      "hiringSignals": "notable job postings and what they signal",
      "keyDifferentiator": "what makes them a threat",
      "threatLevel": "high|medium|low"
    }
  ],
  "marketIntelligence": ["insight1", "insight2", "insight3"],
  "recommendations": ["actionable rec 1", "actionable rec 2", "actionable rec 3"]
}

Competitor data:
${JSON.stringify(competitorData, null, 2).slice(0, 30000)}`,
    "You are an expert competitive intelligence analyst. Be specific and actionable. Base analysis only on the provided data."
  );
  const analysis = JSON.parse(analysisRaw.replace(/```json?\n?|\n?```/g, ""));
  emit("analysis_ready", "Analysis complete", { analysis });

  // 7. Store in MongoDB
  emit("storing", "Saving to database...");
  const db = await getDb();
  const doc = {
    startup_url: startupUrl,
    startup_name: extraction.name,
    startup_summary: extraction.product,
    analyzed_at: new Date(),
    user_email: email,
    competitors: analysis.competitors,
    market_intelligence: analysis.marketIntelligence,
    recommendations: analysis.recommendations,
    report_sent: false,
  };
  const insertResult = await db.collection("analyses").insertOne(doc);

  // 8. Send email
  emit("emailing", "Sending report...");
  const html = buildEmailHtml(extraction, analysis);
  await resend.emails.send({
    from: "Competitor Intel <onboarding@resend.dev>",
    to: email,
    subject: `Competitor Intel: ${extraction.name} vs ${analysis.competitors.length} Competitors`,
    html,
  });

  await db.collection("analyses").updateOne(
    { _id: insertResult.insertedId },
    { $set: { report_sent: true } }
  );

  emit("done", `Analysis complete! Report sent to ${email}`);
  return analysis;
}

function buildEmailHtml(
  startup: { name: string; product: string },
  analysis: {
    competitors: CompetitorInfo[];
    marketIntelligence: string[];
    recommendations: string[];
  }
): string {
  const highThreats = analysis.competitors.filter(
    (c) => c.threatLevel === "high"
  );
  const topThreat = highThreats[0] || analysis.competitors[0];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#1a1a1a;line-height:1.6;">
  <div style="border-bottom:3px solid #000;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="margin:0;font-size:24px;">Competitor Intel Report</h1>
    <p style="margin:4px 0 0;color:#666;">${startup.name} &mdash; ${startup.product}</p>
  </div>

  <div style="background:#f0f4ff;border-left:4px solid #2563eb;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
    <h2 style="margin:0 0 8px;font-size:16px;color:#2563eb;">Executive Summary</h2>
    <p style="margin:0;"><strong>Top threat:</strong> ${topThreat?.name || "N/A"} &mdash; ${topThreat?.keyDifferentiator || ""}</p>
    <p style="margin:8px 0 0;"><strong>Key insight:</strong> ${analysis.recommendations[0] || ""}</p>
  </div>

  <h2 style="font-size:18px;border-bottom:1px solid #e5e5e5;padding-bottom:8px;">Competitor Analysis</h2>
  ${analysis.competitors
    .map(
      (c, i) => `
  <div style="margin-bottom:24px;padding:16px;background:${c.threatLevel === "high" ? "#fff5f5" : c.threatLevel === "medium" ? "#fffbeb" : "#f0fdf4"};border-radius:8px;border:1px solid ${c.threatLevel === "high" ? "#fecaca" : c.threatLevel === "medium" ? "#fde68a" : "#bbf7d0"};">
    <h3 style="margin:0 0 8px;">
      ${i + 1}. ${c.name}
      <span style="font-size:12px;padding:2px 8px;border-radius:12px;margin-left:8px;background:${c.threatLevel === "high" ? "#ef4444" : c.threatLevel === "medium" ? "#f59e0b" : "#22c55e"};color:white;">${c.threatLevel.toUpperCase()}</span>
    </h3>
    <p style="margin:0 0 4px;font-size:14px;color:#666;">${c.url}</p>
    <p style="margin:0 0 8px;">${c.summary}</p>
    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:4px 8px 4px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">Pricing:</td><td style="padding:4px 0;">${c.pricing}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">Recent moves:</td><td style="padding:4px 0;">${c.recentMoves}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">Hiring signals:</td><td style="padding:4px 0;">${c.hiringSignals}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">Differentiator:</td><td style="padding:4px 0;">${c.keyDifferentiator}</td></tr>
    </table>
  </div>`
    )
    .join("")}

  <h2 style="font-size:18px;border-bottom:1px solid #e5e5e5;padding-bottom:8px;">Market Intelligence</h2>
  <ul style="padding-left:20px;">
    ${analysis.marketIntelligence.map((m) => `<li style="margin-bottom:8px;">${m}</li>`).join("")}
  </ul>

  <h2 style="font-size:18px;border-bottom:1px solid #e5e5e5;padding-bottom:8px;">Recommendations</h2>
  <ol style="padding-left:20px;">
    ${analysis.recommendations.map((r) => `<li style="margin-bottom:8px;">${r}</li>`).join("")}
  </ol>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;">
    Generated by Competitor Intel &bull; Powered by Firecrawl, Reducto, Resend, MongoDB
  </div>
</body>
</html>`;
}
