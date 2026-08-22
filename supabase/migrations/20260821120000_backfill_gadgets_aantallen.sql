-- 1) Product uit je Excel dat nog niet in de app-lijst stond
INSERT INTO public.items (category, name, unit, sort_order)
SELECT 'gadgets', 'BAD GUYS KNUFFELS', 'STUKS',
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.items WHERE category = 'gadgets')
WHERE NOT EXISTS (
  SELECT 1 FROM public.items WHERE category = 'gadgets' AND name = 'BAD GUYS KNUFFELS'
);

-- 2) Aantallen invullen op locatie "Toog", per productnaam uit je Excel
WITH aantallen(product_name, qty) AS (
  VALUES
    ('BAD GUYS KNUFFELS', 9),
    ('ZOOTROPOLIS CARROT CONTAINER', 6),
    ('ZOOTROPOLIS TIN HOLDER GARY', 62),
    ('ZOOTROPOLIS CUB MINIATURE DOME', 10),
    ('ZOOTROPOLIS TIN TUB GREEN', 66),
    ('ZOOTROPOLIS TIN TUB BLUE CINEMA SEATS', 111),
    ('AVATAR 3 BUCKET PINK', 437),
    ('AVATAR 3 BUCKET WITH BANSHEE', 35),
    ('AVATAR 3 DOUBLE WALL CUP', 9),
    ('MARIO POPCORN TIN', 25),
    ('MARIO POPCORN TIN VIERKANT', 5),
    ('HOPPERS/JUMPERS BUCKET', 33),
    ('DEVILS WEARS PRADA SLEUTELHANGERS', 40),
    ('TOY STORY 5 EMMERS', 38),
    ('STAR WARS ATAT CONTAINER', 1)
)
INSERT INTO public.counts (item_id, location, qty, updated_at)
SELECT items.id, 'Toog', aantallen.qty, now()
FROM aantallen
JOIN public.items ON items.category = 'gadgets' AND items.name = aantallen.product_name
ON CONFLICT (item_id, location)
DO UPDATE SET qty = EXCLUDED.qty, updated_at = EXCLUDED.updated_at;
