import { jsPDF } from "jspdf";

interface CompetitorData {
  name: string;
  url: string;
  summary: string;
  pricing: string;
  recentMoves: string;
  hiringSignals: string;
  keyDifferentiator: string;
  threatLevel: string;
}

interface ReportInput {
  startup_name: string;
  startup_url: string;
  analyzed_at: string;
  competitors: CompetitorData[];
  market_intelligence: string[];
  recommendations: (string | { action: string; priority?: string; impact?: string })[];
}

const THREAT_COLORS: Record<string, { r: number; g: number; b: number }> = {
  high: { r: 220, g: 38, b: 38 },
  medium: { r: 217, g: 119, b: 6 },
  low: { r: 5, g: 150, b: 105 },
};

const THREAT_BG: Record<string, { r: number; g: number; b: number }> = {
  high: { r: 254, g: 202, b: 202 },
  medium: { r: 254, g: 243, b: 199 },
  low: { r: 209, g: 250, b: 229 },
};

export function generatePdfBuffer(report: ReportInput): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = margin;
    }
  }

  function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  }

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 26);
  doc.text(`Competitor Intel: ${report.startup_name}`, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(136, 136, 136);
  const date = new Date(report.analyzed_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(`${report.startup_url} · ${date}`, margin, y);
  y += 12;

  // Section: Competitors
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 51, 51);
  doc.text(`Competitors (${report.competitors.length})`, margin, y);
  y += 2;
  doc.setDrawColor(238, 238, 238);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  for (const c of report.competitors) {
    const level = (c.threatLevel?.toLowerCase() || "low") as string;
    const threatColor = THREAT_COLORS[level] || THREAT_COLORS.low;
    const threatBg = THREAT_BG[level] || THREAT_BG.low;

    // Estimate height needed
    const summaryLines = wrapText(c.summary || "", contentWidth - 10, 10);
    const estimatedHeight = 50 + summaryLines.length * 5;
    checkPage(estimatedHeight);

    // Card border
    const borderColor = level === "high" ? { r: 248, g: 113, b: 113 }
      : level === "medium" ? { r: 251, g: 191, b: 36 }
      : { r: 52, g: 211, b: 153 };
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.setLineWidth(0.3);

    const cardStartY = y - 4;

    // Name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 26);
    doc.text(c.name, margin + 5, y);

    // Badge
    const badgeText = c.threatLevel?.toUpperCase() || "LOW";
    doc.setFontSize(8);
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    const badgeX = margin + contentWidth - badgeWidth - 3;
    doc.setFillColor(threatBg.r, threatBg.g, threatBg.b);
    doc.roundedRect(badgeX, y - 4.5, badgeWidth, 6.5, 3, 3, "F");
    doc.setTextColor(threatColor.r, threatColor.g, threatColor.b);
    doc.setFont("helvetica", "bold");
    doc.text(badgeText, badgeX + 4, y - 0.5);

    y += 6;

    // Summary
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    for (const line of summaryLines) {
      checkPage(6);
      doc.text(line, margin + 5, y);
      y += 4.5;
    }
    y += 3;

    // Details grid
    const details = [
      { label: "Pricing", value: c.pricing },
      { label: "Differentiator", value: c.keyDifferentiator },
      { label: "Hiring", value: c.hiringSignals },
      { label: "Recent", value: c.recentMoves },
    ];

    doc.setFontSize(9);
    const colWidth = (contentWidth - 10) / 2;
    for (let i = 0; i < details.length; i += 2) {
      checkPage(12);
      for (let j = 0; j < 2 && i + j < details.length; j++) {
        const d = details[i + j];
        const x = margin + 5 + j * colWidth;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 51, 51);
        doc.text(`${d.label}: `, x, y);
        const labelW = doc.getTextWidth(`${d.label}: `);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(102, 102, 102);
        const valueLines = wrapText(d.value || "N/A", colWidth - labelW - 2, 9);
        doc.text(valueLines[0] || "N/A", x + labelW, y);
        if (valueLines.length > 1) {
          for (let k = 1; k < valueLines.length; k++) {
            y += 4;
            checkPage(6);
            doc.text(valueLines[k], x, y);
          }
        }
      }
      y += 5;
    }

    // Draw card border
    const cardHeight = y - cardStartY + 2;
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.roundedRect(margin, cardStartY, contentWidth, cardHeight, 3, 3, "S");

    y += 6;
  }

  // Recommendations
  const recs = report.recommendations;
  if (recs.length > 0) {
    checkPage(20);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text("Recommendations", margin, y);
    y += 2;
    doc.setDrawColor(238, 238, 238);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    doc.setFontSize(10);
    for (let i = 0; i < recs.length; i++) {
      const text = typeof recs[i] === "string" ? recs[i] as string : (recs[i] as { action: string }).action;
      const lines = wrapText(text, contentWidth - 10, 10);
      checkPage(lines.length * 5 + 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 51, 51);
      doc.text(`${i + 1}.`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 51, 51);
      for (const line of lines) {
        doc.text(line, margin + 7, y);
        y += 4.5;
      }
      y += 2;
    }
  }

  // Market Intelligence
  if (report.market_intelligence.length > 0) {
    checkPage(20);
    y += 4;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text("Market Intelligence", margin, y);
    y += 2;
    doc.setDrawColor(238, 238, 238);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    for (const m of report.market_intelligence) {
      const lines = wrapText(m, contentWidth - 10, 10);
      checkPage(lines.length * 5 + 4);
      doc.text("•", margin, y);
      for (const line of lines) {
        doc.text(line, margin + 5, y);
        y += 4.5;
      }
      y += 2;
    }
  }

  // Footer
  checkPage(15);
  y += 8;
  doc.setDrawColor(238, 238, 238);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  doc.text(
    "Generated by Competitor Intel · Powered by Firecrawl, Claude, Reducto, MongoDB, Resend",
    pageWidth / 2, y, { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
}
