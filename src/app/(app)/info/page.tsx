import Link from "next/link";
import { Pencil } from "lucide-react";

import { InfoItemView } from "@/components/info/item-view";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { listInfo } from "@/lib/info/queries";

export default async function InfoPage() {
  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  const isManager = isManagerRole(membership.role);
  const sections = await listInfo(membership.building_id);

  const hasContent = sections.some((s) => s.items.length > 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Info Desk</h1>
          <p className="text-muted-foreground text-sm">
            Management contacts, hours, policies, and amenities.
          </p>
        </div>
        {isManager ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/info/manage">
              <Pencil data-icon="inline-start" />
              Edit info
            </Link>
          </Button>
        ) : null}
      </header>

      {!hasContent && !isManager ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          Nothing has been posted here yet.
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(({ section, items }) => (
            <section key={section.id} className="space-y-3">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              {items.length ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <InfoItemView key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nothing here yet.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
