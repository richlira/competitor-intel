import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { startupUrl } = await req.json();

  if (!startupUrl) {
    return Response.json({ error: "Missing startupUrl" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (step: string, detail?: string, data?: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ step, detail, data })}\n\n`)
        );
      };

      try {
        await runPipeline(startupUrl, emit);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emit("error", message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
