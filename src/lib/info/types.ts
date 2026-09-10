// Domain types for the info desk (Stage 6).

export interface InfoSection {
  id: string;
  building_id: string;
  slug: string;
  title: string;
  sort_order: number;
}

export interface InfoItem {
  id: string;
  building_id: string;
  section_id: string;
  title: string;
  body: string;
  phone: string | null;
  url: string | null;
  sort_order: number;
  updated_at: string;
}

/** A section together with its ordered items. */
export interface SectionWithItems {
  section: InfoSection;
  items: InfoItem[];
}
