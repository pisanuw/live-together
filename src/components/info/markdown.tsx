import { Fragment } from "react";

import { parseBlocks, tokenizeInline } from "@/lib/info/markdown";

/** Renders an inline-token run to React nodes (no raw HTML). */
function Inline({ text }: { text: string }) {
  return (
    <>
      {tokenizeInline(text).map((token, i) => {
        switch (token.type) {
          case "bold":
            return <strong key={i}>{token.value}</strong>;
          case "italic":
            return <em key={i}>{token.value}</em>;
          case "link":
            return (
              <a
                key={i}
                href={token.href}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {token.text}
              </a>
            );
          default:
            return <Fragment key={i}>{token.value}</Fragment>;
        }
      })}
    </>
  );
}

/** Renders the safe markdown subset (see @/lib/info/markdown) as React nodes. */
export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, bi) =>
        block.type === "list" ? (
          <ul key={bi} className="list-disc space-y-0.5 pl-5">
            {block.items.map((item, ii) => (
              <li key={ii}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={bi}>
            {block.lines.map((line, li) => (
              <Fragment key={li}>
                {li > 0 ? <br /> : null}
                <Inline text={line} />
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}
