import { ExternalLink, Phone } from "lucide-react";

import { Markdown } from "@/components/info/markdown";
import { Button } from "@/components/ui/button";
import type { InfoItem } from "@/lib/info/types";

/** Read-only rendering of an info item: body markdown + click-to-call + link. */
export function InfoItemView({ item }: { item: InfoItem }) {
  const telHref = item.phone
    ? `tel:${item.phone.replace(/[^+\d]/g, "")}`
    : null;

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h3 className="font-medium">{item.title}</h3>
      {item.body ? <Markdown text={item.body} /> : null}
      {telHref || item.url ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {telHref ? (
            <Button asChild variant="outline" size="sm">
              <a href={telHref}>
                <Phone data-icon="inline-start" />
                {item.phone}
              </a>
            </Button>
          ) : null}
          {item.url ? (
            <Button asChild variant="outline" size="sm">
              <a href={item.url} target="_blank" rel="noreferrer">
                <ExternalLink data-icon="inline-start" />
                Visit
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
