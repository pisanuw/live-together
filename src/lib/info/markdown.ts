// A deliberately tiny, safe markdown subset for info-desk content: paragraphs,
// bullet lists, **bold**, *italic*, and [text](url) links. Parsing is pure and
// unit-tested; the renderer builds React nodes (never dangerouslySetInnerHTML),
// and only http(s)/mailto/tel links survive — so untrusted schemes can't inject.

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

/** Returns the href if it uses a safe scheme, else null (render as text). */
export function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(trimmed) ? trimmed : null;
}

/** Splits text into paragraph and bullet-list blocks (blank-line separated). */
export function parseBlocks(text: string): Block[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  return normalized
    .split(/\n\s*\n/)
    .map((chunk) => {
      const lines = chunk
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return null;

      const heading = lines.length === 1 && /^(#{1,6})\s+/.exec(lines[0]);
      if (heading) {
        return {
          type: "heading" as const,
          level: heading[1].length,
          text: lines[0].slice(heading[1].length).trim(),
        };
      }

      if (lines.every((l) => /^[-*]\s+/.test(l))) {
        return {
          type: "list" as const,
          items: lines.map((l) => l.replace(/^[-*]\s+/, "")),
        };
      }
      return { type: "paragraph" as const, lines };
    })
    .filter((b): b is Block => b !== null);
}

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/** Tokenizes a line into text / bold / italic / link runs. */
export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    const [full, linkText, linkHref, bold, italic] = match;
    if (linkText !== undefined) {
      const href = safeHref(linkHref);
      // Unsafe scheme: keep the raw markdown as plain text rather than linking.
      tokens.push(
        href
          ? { type: "link", text: linkText, href }
          : { type: "text", value: full }
      );
    } else if (bold !== undefined) {
      tokens.push({ type: "bold", value: bold });
    } else if (italic !== undefined) {
      tokens.push({ type: "italic", value: italic });
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}
