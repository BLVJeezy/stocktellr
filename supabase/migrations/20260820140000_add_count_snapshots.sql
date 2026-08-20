-- Snapshot header: one row per saved stocktelling (e.g. monthly count)
CREATE TABLE public.count_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Snapshot line items: one row per (item, location) frozen at snapshot time.
-- We copy name/category/unit so history stays correct even if items are renamed or deleted later.
CREATE TABLE public.count_snapshot_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.count_snapshots(id) ON DELETE CASCADE,
  item_id UUID,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL,
  item_unit TEXT NOT NULL,
  item_sort_order INT NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX count_snapshot_rows_snapshot_id_idx ON public.count_snapshot_rows(snapshot_id);
CREATE INDEX count_snapshots_taken_at_idx ON public.count_snapshots(taken_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.count_snapshots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.count_snapshot_rows TO anon, authenticated;
GRANT ALL ON public.count_snapshots TO service_role;
GRANT ALL ON public.count_snapshot_rows TO service_role;

ALTER TABLE public.count_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.count_snapshot_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots select public" ON public.count_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "snapshots insert public" ON public.count_snapshots FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "snapshots update public" ON public.count_snapshots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "snapshots delete public" ON public.count_snapshots FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "snapshot rows select public" ON public.count_snapshot_rows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "snapshot rows insert public" ON public.count_snapshot_rows FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "snapshot rows update public" ON public.count_snapshot_rows FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "snapshot rows delete public" ON public.count_snapshot_rows FOR DELETE TO anon, authenticated USING (true);
