import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Item, Count } from "@/lib/inventory";

export type Snapshot = {
  id: string;
  label: string;
  taken_at: string;
  created_at: string;
};

export type SnapshotRow = {
  id: string;
  snapshot_id: string;
  item_id: string | null;
  item_name: string;
  item_category: string;
  item_unit: string;
  item_sort_order: number;
  location: string;
  qty: number;
};

export function useSnapshots() {
  return useQuery({
    queryKey: ["snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("count_snapshots")
        .select("*")
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
  });
}

export function useSnapshot(id: string | undefined) {
  return useQuery({
    queryKey: ["snapshot", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: header, error: headerErr }, { data: rows, error: rowsErr }] = await Promise.all([
        supabase.from("count_snapshots").select("*").eq("id", id!).maybeSingle(),
        supabase.from("count_snapshot_rows").select("*").eq("snapshot_id", id!),
      ]);
      if (headerErr) throw headerErr;
      if (rowsErr) throw rowsErr;
      return {
        snapshot: header as Snapshot | null,
        rows: (rows ?? []) as SnapshotRow[],
      };
    },
  });
}

export function useSaveSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      label,
      items,
      counts,
    }: {
      label: string;
      items: Item[];
      counts: Count[];
    }) => {
      const { data: snap, error: snapErr } = await supabase
        .from("count_snapshots")
        .insert({ label })
        .select()
        .single();
      if (snapErr) throw snapErr;

      const itemById = new Map(items.map((i) => [i.id, i]));
      const rows = counts
        .map((c) => {
          const item = itemById.get(c.item_id);
          if (!item) return null;
          return {
            snapshot_id: snap.id,
            item_id: item.id,
            item_name: item.name,
            item_category: item.category,
            item_unit: item.unit,
            item_sort_order: item.sort_order,
            location: c.location,
            qty: c.qty,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length > 0) {
        const { error: rowsErr } = await supabase.from("count_snapshot_rows").insert(rows);
        if (rowsErr) throw rowsErr;
      }

      return snap as Snapshot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("count_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}
