-- Optional starter content for the info desk, so a fresh building isn't blank.
-- Idempotent (guarded by title per section). Safe to run more than once.
-- Managers can edit or delete any of these from /info/manage.

insert into wcv.info_items (building_id, section_id, title, body, phone, sort_order)
select s.building_id, s.id, x.title, x.body, x.phone, x.ord
from wcv.info_sections s
join wcv.buildings b on b.id = s.building_id and b.slug = 'wcv'
join (values
  ('contacts', 'Building Manager',
   'Reach the on-site manager for general questions and access issues.',
   '+1 555-0100', 0),
  ('contacts', 'Emergency Maintenance',
   'For urgent after-hours issues such as leaks, no heat, or lockouts.',
   '+1 555-0199', 1),
  ('hours', 'Management Office',
   E'**Mon–Fri** 9:00am – 5:00pm\n**Sat–Sun** closed', null, 0),
  ('policies', 'Quiet hours',
   'Please keep noise down between **10pm and 8am** out of respect for neighbors.',
   null, 0)
) as x(section_slug, title, body, phone, ord) on x.section_slug = s.slug
where not exists (
  select 1 from wcv.info_items i
  where i.section_id = s.id and i.title = x.title
);
