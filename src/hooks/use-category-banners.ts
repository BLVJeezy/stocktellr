import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function useCategoryBanners() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["category-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_banners").select("category, image_url");
      if (error) throw error;
      const map: Record<string, string | null> = {};
      for (const row of data ?? []) map[row.category] = row.image_url;
      return map;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("category-banners-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "category_banners" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["category-banners"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadCategoryBanner(category: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `category-banners/${category}/${Date.now()}.${ext || "jpg"}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !signed?.signedUrl) throw signError ?? new Error("Kon geen link maken");

  const { error } = await supabase
    .from("category_banners")
    .upsert({ category, image_url: signed.signedUrl, updated_at: new Date().toISOString() });
  if (error) throw error;

  return signed.signedUrl;
}
