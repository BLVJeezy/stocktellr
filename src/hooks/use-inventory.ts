import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Count, Item } from "@/lib/inventory";

async function fetchInventory() {
  const [itemsRes, countsRes] = await Promise.all([
    supabase.from("items").select("id, category, name, unit, sort_order, image_url").order("sort_order"),
    supabase.from("counts").select("id, item_id, location, qty"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (countsRes.error) throw countsRes.error;
  return {
    items: (itemsRes.data ?? []) as Item[],
    counts: (countsRes.data ?? []).map((c) => ({ ...c, qty: Number(c.qty) })) as Count[],
  };
}

export function useInventory() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });

  useEffect(() => {
    const channel = supabase
      .channel("inventory-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "counts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export async function setCount(itemId: string, location: string, qty: number) {
  const { error } = await supabase
    .from("counts")
    .upsert(
      { item_id: itemId, location, qty, updated_at: new Date().toISOString() },
      { onConflict: "item_id,location" },
    );
  if (error) throw error;
}