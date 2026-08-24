import type { PropertyRecord } from "@/lib/types/property";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardSummary = {
  propertiesTotal: number;
  propertiesDraft: number;
  propertiesPublished: number;
  propertiesArchived: number;
  mediaTotal: number;
  mediaImages: number;
  mediaVideos: number;
  leadsTotal: number;
  recentPublished: PropertyRecord[];
};

type CountOptions = {
  table: string;
  eq?: { column: string; value: string };
};

async function countRows(supabase: SupabaseClient, options: CountOptions): Promise<number> {
  let query = supabase.from(options.table).select("*", { count: "exact", head: true });

  if (options.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getDashboardSummary(supabase: SupabaseClient): Promise<DashboardSummary> {
  const [
    propertiesTotal,
    propertiesDraft,
    propertiesPublished,
    propertiesArchived,
    mediaTotal,
    mediaImages,
    mediaVideos,
    leadsTotal
  ] = await Promise.all([
    countRows(supabase, { table: "properties" }),
    countRows(supabase, { table: "properties", eq: { column: "status", value: "draft" } }),
    countRows(supabase, { table: "properties", eq: { column: "status", value: "published" } }),
    countRows(supabase, { table: "properties", eq: { column: "status", value: "archived" } }),
    countRows(supabase, { table: "property_media" }),
    countRows(supabase, { table: "property_media", eq: { column: "kind", value: "image" } }),
    countRows(supabase, { table: "property_media", eq: { column: "kind", value: "video" } }),
    countRows(supabase, { table: "leads" })
  ]);

  const recent = await supabase
    .from("properties")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(5);

  if (recent.error) {
    throw new Error(recent.error.message);
  }

  return {
    propertiesTotal,
    propertiesDraft,
    propertiesPublished,
    propertiesArchived,
    mediaTotal,
    mediaImages,
    mediaVideos,
    leadsTotal,
    recentPublished: (recent.data ?? []) as PropertyRecord[]
  };
}
