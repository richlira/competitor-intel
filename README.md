# Competitor Intel

AI-powered competitive intelligence agent. Paste a startup URL, get a full competitor analysis report in your inbox in 60 seconds.

Built for **Hack the Stackathon** at YC HQ, San Francisco.

## How It Works

```
Startup URL + Email
       │
       ▼
┌──────────────┐     ┌───────────┐     ┌──────────────┐
│  Firecrawl   │────▶│  Claude    │────▶│  Firecrawl   │
│  Scrape site │     │  Extract   │     │  Search for  │
│              │     │  product,  │     │  competitors │
│              │     │  industry  │     │              │
└──────────────┘     └───────────┘     └──────┬───────┘
                                              │
                                              ▼
┌──────────────┐     ┌───────────┐     ┌──────────────┐
│   Resend     │◀────│  Claude    │◀────│  Firecrawl   │
│   Send HTML  │     │  Analyze & │     │  Deep scrape │
│   report     │     │  recommend │     │  top 5       │
└──────────────┘     └───────────┘     └──────────────┘
       │                    │
       ▼                    ▼
   📧 Inbox           ┌──────────┐
                      │ MongoDB  │
                      │ Store    │
                      └──────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Frontend + API routes |
| **LLM** | Claude Sonnet 4 (Anthropic SDK) | Extraction, ranking, analysis |
| **Web Scraping** | Firecrawl | Startup scraping, competitor search, deep scraping |
| **PDF Parsing** | Reducto CLI | Parse whitepapers and case studies |
| **Database** | MongoDB | Store analysis snapshots for historical comparison |
| **Email** | Resend | Deliver HTML intelligence reports |
| **Styling** | Tailwind CSS | Minimal dark UI |

## Pipeline Steps

1. **Scrape startup** — Firecrawl extracts homepage content as markdown
2. **Extract info** — Claude identifies name, product, industry, keywords, target market
3. **Search competitors** — 3 parallel Firecrawl searches: "[product] alternatives", "[product] vs", "G2 [product] competitors"
4. **Rank competitors** — Claude picks the top 5 most relevant competitors
5. **Deep scrape** — For each competitor, scrape homepage, /pricing, /about, /careers in parallel
6. **Parse PDFs** — If any PDF links found (whitepapers, case studies), parse with Reducto
7. **Analyze** — Claude generates per-competitor analysis with threat levels, pricing, hiring signals, recommendations
8. **Store** — Save full analysis to MongoDB for historical tracking
9. **Email** — Send styled HTML report via Resend

## Report Includes

- **Executive Summary** — Top threat and key insight
- **Per-Competitor Analysis** — What they do, pricing, recent moves, hiring signals, threat level
- **Market Intelligence** — Patterns across the competitive landscape
- **Actionable Recommendations** — 3 specific things to do next

## Getting Started

### Prerequisites

- Node.js 18+
- API keys for: Anthropic, Firecrawl, Resend, MongoDB

### Setup

```bash
git clone https://github.com/richlira/competitor-intel.git
cd competitor-intel
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...
RESEND_API_KEY=re_...
MONGODB_URI=mongodb+srv://...
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a startup URL and your email, hit "Analyze Competitors".

## Test URLs

- `https://linear.app` — Project management
- `https://notion.so` — Docs & wiki
- `https://vercel.com` — Deployment platform
- `https://retool.com` — Internal tools
- `https://loom.com` — Video messaging

## MongoDB Schema

```javascript
// Database: competitor-intel
// Collection: analyses
{
  startup_url: "https://linear.app",
  startup_name: "Linear",
  startup_summary: "Project management tool for software teams",
  analyzed_at: ISODate("2026-01-31T18:00:00Z"),
  user_email: "founder@startup.com",
  competitors: [{
    name: "Asana",
    url: "https://asana.com",
    pricing: "Free tier, Pro $10.99/user/mo, Enterprise custom",
    recentMoves: "Launched AI features in Q4",
    hiringSignals: "3 ML Engineer roles, 2 Enterprise Sales",
    keyDifferentiator: "Enterprise market dominance",
    threatLevel: "high",
    summary: "Work management platform for enterprise teams"
  }],
  market_intelligence: ["..."],
  recommendations: ["..."],
  report_sent: true
}
```

## Project Structure

```
app/
  page.tsx                    → Input form + real-time progress
  api/analyze/route.ts        → POST endpoint with SSE streaming
lib/
  anthropic.ts                → Claude API client
  mongodb.ts                  → Database connection singleton
  pipeline.ts                 → Main orchestration (all 9 steps)
  reducto.ts                  → PDF parsing via Reducto CLI
```

## Hackathon Track Alignment

| Track | How We Hit It |
|-------|--------------|
| **Firecrawl** ($5k) | Core of the pipeline — startup scraping, competitor search, deep scraping |
| **Reducto** ($1k) | PDF parsing for competitor whitepapers and case studies |
| **Resend** (Pro) | Email delivery of HTML intelligence reports |
| **MongoDB** ($5k) | Persistent storage for analysis snapshots and historical comparison |
| **Grand Prize** ($25k) | Real data, working end-to-end system, practical utility |

## License

MIT
