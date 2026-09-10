import "server-only";

import type { InfoItem, InfoSection, SectionWithItems } from "@/lib/info/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * All info-desk sections for a building with their items, both ordered by
 * `sort_order`. Empty sections are included so managers can fill them in.
 */
export async function listInfo(
  buildingId: string
): Promise<SectionWithItems[]> {
  const admin = createAdminClient();

  const [{ data: sectionData }, { data: itemData }] = await Promise.all([
    admin
      .from("info_sections")
      .select("*")
      .eq("building_id", buildingId)
      .order("sort_order", { ascending: true }),
    admin
      .from("info_items")
      .select("*")
      .eq("building_id", buildingId)
      .order("sort_order", { ascending: true }),
  ]);

  const sections = (sectionData as InfoSection[] | null) ?? [];
  const items = (itemData as InfoItem[] | null) ?? [];

  const bySection = new Map<string, InfoItem[]>();
  for (const item of items) {
    const list = bySection.get(item.section_id) ?? [];
    list.push(item);
    bySection.set(item.section_id, list);
  }

  return sections.map((section) => ({
    section,
    items: bySection.get(section.id) ?? [],
  }));
}
