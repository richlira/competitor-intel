import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export async function parsePdf(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    const tmpPath = join(tmpdir(), `reducto-${Date.now()}.pdf`);
    writeFileSync(tmpPath, buf);
    execSync(`reducto parse "${tmpPath}"`, { timeout: 30000 });
    const mdPath = tmpPath.replace(".pdf", ".parse.md");
    const content = readFileSync(mdPath, "utf-8");
    try { unlinkSync(tmpPath); unlinkSync(mdPath); } catch {}
    return content;
  } catch {
    return null;
  }
}
