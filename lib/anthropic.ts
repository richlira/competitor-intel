import Anthropic from "@anthropic-ai/sdk";

export async function ask(prompt: string, system?: string): Promise<string> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (block.type === "text") return block.text;
  return "";
}
