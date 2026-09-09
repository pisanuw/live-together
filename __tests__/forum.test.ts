import { describe, expect, test } from "vitest";

import {
  buildCommentTree,
  canDelete,
  canEditOwn,
  excerpt,
  REACTION_EMOJIS,
  summarizeReactions,
} from "@/lib/forum/helpers";
import type { CommentRow } from "@/lib/forum/types";

function makeRow(
  id: string,
  parent_comment_id: string | null,
  body = id
): CommentRow {
  return {
    id,
    building_id: "b1",
    post_id: "p1",
    author_id: "u1",
    parent_comment_id,
    body,
    created_at: "2026-09-09T00:00:00Z",
    edited_at: null,
    deleted_at: null,
  };
}

const decorate = (row: CommentRow) => ({
  id: row.id,
  body: row.body,
  createdAt: row.created_at,
  editedAt: row.edited_at,
  author: { id: row.author_id, name: "U", avatarUrl: null },
  reactions: [],
});

describe("summarizeReactions", () => {
  test("tallies counts and flags the viewer's own reactions", () => {
    const rows = [
      { emoji: "👍", user_id: "a" },
      { emoji: "👍", user_id: "b" },
      { emoji: "❤️", user_id: "a" },
    ];
    const summary = summarizeReactions(rows, "a");
    expect(summary).toEqual([
      { emoji: "👍", count: 2, reacted: true },
      { emoji: "❤️", count: 1, reacted: true },
    ]);
  });

  test("reacted is false when the viewer isn't among the reactors", () => {
    const summary = summarizeReactions([{ emoji: "🎉", user_id: "x" }], "a");
    expect(summary).toEqual([{ emoji: "🎉", count: 1, reacted: false }]);
  });

  test("null viewer never marks a reaction as reacted", () => {
    const summary = summarizeReactions([{ emoji: "👍", user_id: "a" }], null);
    expect(summary[0].reacted).toBe(false);
  });

  test("orders palette emojis first (in palette order), then others alphabetically", () => {
    const rows = [
      { emoji: "zzz", user_id: "a" },
      { emoji: "😮", user_id: "a" },
      { emoji: "👍", user_id: "a" },
      { emoji: "aaa", user_id: "a" },
    ];
    const order = summarizeReactions(rows, "a").map((r) => r.emoji);
    // Palette emojis lead, in REACTION_EMOJIS order (👍 before 😮)...
    expect(REACTION_EMOJIS.indexOf("👍")).toBeLessThan(
      REACTION_EMOJIS.indexOf("😮")
    );
    expect(order.slice(0, 2)).toEqual(["👍", "😮"]);
    // ...then non-palette entries follow, sorted alphabetically.
    expect(order.slice(2)).toEqual(["aaa", "zzz"]);
  });

  test("no reactions yields an empty summary", () => {
    expect(summarizeReactions([], "a")).toEqual([]);
  });
});

describe("permission helpers", () => {
  test("canEditOwn only for the author", () => {
    expect(canEditOwn("u1", "u1")).toBe(true);
    expect(canEditOwn("u2", "u1")).toBe(false);
    expect(canEditOwn(null, "u1")).toBe(false);
  });

  test("canDelete for the author or any moderator", () => {
    expect(canDelete("u1", "u1", false)).toBe(true); // own
    expect(canDelete("u2", "u1", true)).toBe(true); // moderator
    expect(canDelete("u2", "u1", false)).toBe(false); // neither
    expect(canDelete(null, "u1", false)).toBe(false);
  });
});

describe("excerpt", () => {
  test("returns short bodies unchanged with whitespace collapsed", () => {
    expect(excerpt("hello   world\n\nthere")).toBe("hello world there");
  });

  test("truncates long bodies with an ellipsis", () => {
    const long = "a".repeat(300);
    const out = excerpt(long, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(50);
  });

  test("empty body yields empty string", () => {
    expect(excerpt("   ")).toBe("");
  });
});

describe("buildCommentTree", () => {
  test("keeps top-level comments as roots in input order", () => {
    const tree = buildCommentTree(
      [makeRow("c1", null), makeRow("c2", null)],
      decorate
    );
    expect(tree.map((n) => n.id)).toEqual(["c1", "c2"]);
    expect(tree.every((n) => n.replies.length === 0)).toBe(true);
  });

  test("nests a reply under its top-level parent", () => {
    const tree = buildCommentTree(
      [makeRow("c1", null), makeRow("r1", "c1")],
      decorate
    );
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("c1");
    expect(tree[0].replies.map((n) => n.id)).toEqual(["r1"]);
  });

  test("flattens replies-to-replies to the top level (never deeper than one)", () => {
    const tree = buildCommentTree(
      [makeRow("c1", null), makeRow("r1", "c1"), makeRow("r2", "r1")],
      decorate
    );
    // c1 keeps r1; r2 (reply to a reply) is promoted to a root, not dropped.
    expect(tree.map((n) => n.id).sort()).toEqual(["c1", "r2"]);
    const c1 = tree.find((n) => n.id === "c1")!;
    expect(c1.replies.map((n) => n.id)).toEqual(["r1"]);
    expect(c1.replies[0].replies).toEqual([]);
  });

  test("promotes a reply whose parent is missing (e.g. deleted) to a root", () => {
    const tree = buildCommentTree([makeRow("orphan", "gone")], decorate);
    expect(tree.map((n) => n.id)).toEqual(["orphan"]);
  });

  test("does not depend on row order", () => {
    const tree = buildCommentTree(
      [makeRow("r1", "c1"), makeRow("c1", null)],
      decorate
    );
    const c1 = tree.find((n) => n.id === "c1")!;
    expect(c1.replies.map((n) => n.id)).toEqual(["r1"]);
  });
});
