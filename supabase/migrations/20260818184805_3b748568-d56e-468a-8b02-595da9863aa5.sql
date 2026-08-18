
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, location)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counts TO anon, authenticated;
GRANT ALL ON public.counts TO service_role;

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items are public" ON public.items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "items insert public" ON public.items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "items update public" ON public.items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "items delete public" ON public.items FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "counts are public" ON public.counts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "counts insert public" ON public.counts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "counts update public" ON public.counts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "counts delete public" ON public.counts FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE public.items REPLICA IDENTITY FULL;
ALTER TABLE public.counts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.counts;

INSERT INTO public.items (category, name, unit, sort_order) VALUES
  ('snoeptoog', 'Croky Chips Paprika', 'LOS', 1),
  ('snoeptoog', 'Croky Chips Naturel', 'DOOS', 2),
  ('snoeptoog', 'Mars', 'LOS', 3),
  ('snoeptoog', 'Snickers', 'LOS', 4),
  ('snoeptoog', 'Lays Bolognese', 'DOOS', 5),
  ('ijs_berging', 'Ben & Jerry''s Cookie Dough', 'LOS', 1),
  ('ijs_berging', 'Ben & Jerry''s Chocolate Fudge', 'DOOS', 2),
  ('ijs_berging', 'Calippo Lemon', 'LOS', 3),
  ('ijs_berging', 'Magnum Classic', 'DOOS', 4),
  ('ijs_berging', 'Cornetto Vanille', 'LOS', 5),
  ('frigo_los', 'Coca Cola 33cl', 'LOS', 1),
  ('frigo_los', 'Coca Cola Zero 33cl', 'LOS', 2),
  ('frigo_los', 'Aquarius Orange', 'LOS', 3),
  ('frigo_los', 'Fanta Orange 33cl', 'LOS', 4),
  ('frigo_los', 'Chaudfontaine Plat', 'LOS', 5),
  ('frigo_trays', 'Coca Cola Tray 24x33cl', 'TRAYS', 1),
  ('frigo_trays', 'Aquarius Tray 24x33cl', 'TRAYS', 2),
  ('frigo_trays', 'Fristi Tray', 'TRAYS', 3),
  ('frigo_trays', 'Cecemel Tray', 'TRAYS', 4),
  ('haribo', 'Haribo Aardbeien', 'KG', 1),
  ('haribo', 'Haribo Beertjes', 'KG', 2),
  ('haribo', 'Haribo Cola Flesjes', 'BAK', 3),
  ('haribo', 'Haribo Zure Matten', 'BAK', 4);

INSERT INTO public.counts (item_id, location, qty)
SELECT i.id, l.loc, 0
FROM public.items i
JOIN LATERAL (
  SELECT unnest(
    CASE i.category
      WHEN 'snoeptoog' THEN ARRAY['Voorraadhok','Toog']
      WHEN 'ijs_berging' THEN ARRAY['Berging','Vriezer']
      WHEN 'frigo_los' THEN ARRAY['Rek 1','Rek 2']
      WHEN 'frigo_trays' THEN ARRAY['Frigo','Berging']
      WHEN 'haribo' THEN ARRAY['Voorraad Klein']
    END
  ) AS loc
) l ON true;
