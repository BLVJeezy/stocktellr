import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import type { Count, Item } from "@/lib/inventory";

async function fetchInventory() {
  const [itemsRes, countsRes] = await Promise.all([
    supabase.from("items").select("*").order("sort_order"),
    supabase.from("counts").select("*"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (countsRes.error) throw countsRes.error;
  return {
    items: (itemsRes.data ?? []).map((row) => {
      // pack_size / units_per_pack are optional pack-conversion fields that may
      // not be present in the generated types yet; default them so the UI works.
      const r = row as Record<string, unknown>;
      return {
        ...row,
        pack_size: (r.pack_size as string | null) ?? null,
        units_per_pack: (r.units_per_pack as number | null) ?? null,
      } as unknown as Item;
    }) as Item[],
    counts: (countsRes.data ?? []).map((c) => ({
      ...c,
      qty: Number(c.qty),
      formula: (c as { formula?: string | null }).formula ?? null,
    })) as Count[],
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

export async function setCount(itemId: string, location: string, qty: number, formula: string | null = null) {
  const { error } = await supabase
    .from("counts")
    .upsert(
      { item_id: itemId, location, qty, formula, updated_at: new Date().toISOString() },
      { onConflict: "item_id,location" },
    );
  if (error) throw error;
}

export async function addItem(category: string, name: string, unit: string) {
  const { data: last } = await supabase
    .from("items")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("items")
    .insert({ category, name, unit, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function deleteItems(itemIds: string[]) {
  if (itemIds.length === 0) return;
  const { error } = await supabase.from("items").delete().in("id", itemIds);
  if (error) throw error;
}

export async function renameItems(itemIds: string[], newName: string) {
  const trimmed = newName.trim();
  if (!trimmed || itemIds.length === 0) return;
  const { error } = await supabase.from("items").update({ name: trimmed }).in("id", itemIds);
  if (error) throw error;
}

export async function moveItemsToCategory(itemIds: string[], newCategory: string) {
  if (itemIds.length === 0) return;
  const { error } = await supabase.from("items").update({ category: newCategory }).in("id", itemIds);
  if (error) throw error;
}

export async function resetAllCounts() {
  // Delete every saved count so every product goes back to 0 across all locations.
  const { error } = await supabase.from("counts").delete().not("id", "is", null);
  if (error) throw error;
}

export async function setItemDone(itemId: string, done: boolean) {
  const { error } = await supabase.from("items").update({ done }).eq("id", itemId);
  if (error) throw error;
}

export async function setItemComment(itemId: string, comment: string) {
  const { error } = await supabase
    .from("items")
    .update({ comment: comment.trim() === "" ? null : comment.trim() })
    .eq("id", itemId);
  if (error) throw error;
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadItemImage(itemId: string, file: File) {
  const compressed = await compressImage(file);
  const ext = "jpg";
  const path = `${itemId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, { contentType: compressed.type || "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !signed?.signedUrl) throw signError ?? new Error("Kon geen link maken");

  const { error } = await supabase
    .from("items")
    .update({ image_url: signed.signedUrl })
    .eq("id", itemId);
  if (error) throw error;

  return signed.signedUrl;
}