import { describe, expect, test } from "vitest";

import { parseBlocks, safeHref, tokenizeInline } from "@/lib/info/markdown";

describe("safeHref", () => {
  test("allows http, https, mailto, tel", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("http://x.io")).toBe("http://x.io");
    expect(safeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeHref("tel:+15551234")).toBe("tel:+15551234");
  });

  test("rejects dangerous or relative schemes", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("/local/path")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
  });
});

describe("parseBlocks", () => {
  test("splits paragraphs on blank lines", () => {
    const blocks = parseBlocks("Hello there\nsecond line\n\nA new paragraph");
    expect(blocks).toEqual([
      { type: "paragraph", lines: ["Hello there", "second line"] },
      { type: "paragraph", lines: ["A new paragraph"] },
    ]);
  });

  test("recognizes bullet lists and strips markers", () => {
    const blocks = parseBlocks("- one\n- two\n* three");
    expect(blocks).toEqual([{ type: "list", items: ["one", "two", "three"] }]);
  });

  test("empty input yields no blocks", () => {
    expect(parseBlocks("   \n  \n")).toEqual([]);
  });
});

describe("tokenizeInline", () => {
  test("plain text is a single token", () => {
    expect(tokenizeInline("just text")).toEqual([
      { type: "text", value: "just text" },
    ]);
  });

  test("bold and italic", () => {
    expect(tokenizeInline("a **b** c")).toEqual([
      { type: "text", value: "a " },
      { type: "bold", value: "b" },
      { type: "text", value: " c" },
    ]);
    expect(tokenizeInline("*em*")).toEqual([{ type: "italic", value: "em" }]);
  });

  test("safe links become link tokens", () => {
    expect(tokenizeInline("see [site](https://x.io) now")).toEqual([
      { type: "text", value: "see " },
      { type: "link", text: "site", href: "https://x.io" },
      { type: "text", value: " now" },
    ]);
  });

  test("unsafe links fall back to literal text", () => {
    expect(tokenizeInline("[click](javascript:alert)")).toEqual([
      { type: "text", value: "[click](javascript:alert)" },
    ]);
  });
});
