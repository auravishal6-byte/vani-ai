import type { ReactNode } from "react";

function inlineNodes(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${key}-c${index}`} className="rounded-md bg-muted px-1 font-mono text-sm">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={`${key}-b${index}`} className="font-medium">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: "code"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "p"; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const parts = source.split("```");
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const lines = part.replace(/^\n/, "").replace(/\n$/, "").split("\n");
      const first = lines[0] ?? "";
      const text =
        lines.length > 1 && /^[\w.+-]+$/.test(first) ? lines.slice(1).join("\n") : lines.join("\n");
      blocks.push({ type: "code", text });
      return;
    }
    const paragraphs = part.split(/\n{2,}/);
    for (const paragraph of paragraphs) {
      const lines = paragraph.split("\n").filter((line) => line.trim().length > 0);
      if (lines.length === 0) continue;
      const unordered = lines.every((line) => /^\s*[-*]\s+/.test(line));
      const ordered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
      if (unordered || ordered) {
        blocks.push({
          type: "list",
          ordered,
          items: lines.map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "")),
        });
      } else {
        blocks.push({ type: "p", text: lines.join("\n") });
      }
    }
  });
  return blocks;
}

export function RichText({ text }: { text: string }) {
  const blocks = parse(text);
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-3 text-pretty leading-relaxed">
      {blocks.map((block, index) => {
        const key = `b${index}`;
        if (block.type === "code") {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-xl bg-foreground px-4 py-3 font-mono text-sm text-background"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={key}
              className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{inlineNodes(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={key} className="whitespace-pre-wrap">
            {inlineNodes(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}
