CREATE TABLE IF NOT EXISTS public.category_banners (
  category TEXT NOT NULL PRIMARY KEY,
  image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_banners TO anon, authenticated;
GRANT ALL ON public.category_banners TO service_role;

ALTER TABLE public.category_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category banners all public" ON public.category_banners
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.category_banners REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_banners;
