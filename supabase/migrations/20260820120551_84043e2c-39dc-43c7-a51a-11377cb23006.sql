ALTER TABLE public.items ADD COLUMN IF NOT EXISTS done boolean NOT NULL DEFAULT false;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS comment text;

CREATE TABLE IF NOT EXISTS public.count_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.count_snapshots TO anon, authenticated;
GRANT ALL ON public.count_snapshots TO service_role;
ALTER TABLE public.count_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots public select" ON public.count_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "snapshots public insert" ON public.count_snapshots FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "snapshots public update" ON public.count_snapshots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "snapshots public delete" ON public.count_snapshots FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.count_snapshot_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.count_snapshots(id) ON DELETE CASCADE,
  item_id uuid,
  item_name text NOT NULL,
  item_category text NOT NULL,
  item_unit text NOT NULL,
  item_sort_order integer NOT NULL DEFAULT 0,
  location text NOT NULL,
  qty numeric NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS count_snapshot_rows_snapshot_idx ON public.count_snapshot_rows(snapshot_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.count_snapshot_rows TO anon, authenticated;
GRANT ALL ON public.count_snapshot_rows TO service_role;
ALTER TABLE public.count_snapshot_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshot rows public select" ON public.count_snapshot_rows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "snapshot rows public insert" ON public.count_snapshot_rows FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "snapshot rows public update" ON public.count_snapshot_rows FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "snapshot rows public delete" ON public.count_snapshot_rows FOR DELETE TO anon, authenticated USING (true);