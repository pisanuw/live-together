import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Markdown } from "@/components/info/markdown";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/forum/format";
import { getLegalDoc } from "@/content/legal";

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const legal = getLegalDoc(doc);
  if (!legal) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/settings">
          <ArrowLeft data-icon="inline-start" />
          Back to settings
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{legal!.title}</h1>
        <p className="text-muted-foreground text-sm">
          Last updated {formatWhen(legal!.updated)}
        </p>
      </div>

      <Markdown text={legal!.body} />
    </div>
  );
}
