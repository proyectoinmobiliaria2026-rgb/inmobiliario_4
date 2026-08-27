import type { PropertyRecord } from "@/lib/types/property";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardSummary = {
  propertiesTotal: number;
  propertiesDraft: number;
  propertiesActive: number;
  propertiesArchived: number;
  pendingPhotos: number;
  pendingStaging: number;
  printableAvailable: number;
  copiesPending: number;
  publicationsScheduled: number;
  publicationsPublishedInternal: number;
  stagingIntegrated: boolean;
  reelIntegrated: boolean;
  socialIntegrated: boolean;
  recentPublished: PropertyRecord[];
};

const CONTENT_CHANNELS = ["facebook", "instagram", "tiktok"];

async function countRows(
  supabase: SupabaseClient,
  table: string,
  eq?: { column: string; value: string }
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (eq) {
    query = query.eq(eq.column, eq.value);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function getDashboardSummary(supabase: SupabaseClient): Promise<DashboardSummary> {
  const propertiesTotal = await countRows(supabase, "properties");
  const propertiesDraft = await countRows(supabase, "properties", { column: "status", value: "draft" });
  const propertiesActive = await countRows(supabase, "properties", { column: "status", value: "active" });
  const propertiesArchived = await countRows(supabase, "properties", { column: "status", value: "archived" });

  const publicationsScheduled = await countRows(supabase, "publications", { column: "status", value: "scheduled" });
  const publicationsPublishedInternal = await countRows(supabase, "publications", { column: "status", value: "published" });

  const { data: media, error: mediaError } = await supabase
    .from("property_media")
    .select("property_id, kind, state, derived_from")
    .limit(5000);
  if (mediaError) {
    throw new Error(mediaError.message);
  }

  const withImage = new Set<string>();
  const withStaged = new Set<string>();
  for (const row of media ?? []) {
    if (row.kind === "image") {
      withImage.add(row.property_id);
      if (row.derived_from || row.state === "generated" || row.state === "edited") {
        withStaged.add(row.property_id);
      }
    }
  }

  const pendingPhotos = Math.max(0, propertiesTotal - withImage.size);
  const pendingStaging = Math.max(0, withImage.size - withStaged.size);

  const { data: generations, error: genError } = await supabase
    .from("ai_generations")
    .select("property_id, channel")
    .limit(5000);
  if (genError) {
    throw new Error(genError.message);
  }

  const channelsByProperty = new Map<string, Set<string>>();
  for (const row of generations ?? []) {
    if (!channelsByProperty.has(row.property_id)) {
      channelsByProperty.set(row.property_id, new Set());
    }
    channelsByProperty.get(row.property_id)!.add(row.channel);
  }

  let withAllCopies = 0;
  for (const channels of channelsByProperty.values()) {
    if (CONTENT_CHANNELS.every((channel) => channels.has(channel))) {
      withAllCopies += 1;
    }
  }
  const copiesPending = Math.max(0, propertiesTotal - withAllCopies);

  const recent = await supabase
    .from("properties")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);
  if (recent.error) {
    throw new Error(recent.error.message);
  }

  return {
    propertiesTotal,
    propertiesDraft,
    propertiesActive,
    propertiesArchived,
    pendingPhotos,
    pendingStaging,
    printableAvailable: propertiesTotal,
    copiesPending,
    publicationsScheduled,
    publicationsPublishedInternal,
    stagingIntegrated: Boolean(process.env.STAGING_PROVIDER),
    reelIntegrated: Boolean(process.env.REEL_PROVIDER),
    socialIntegrated: Boolean(process.env.SOCIAL_INTEGRATION),
    recentPublished: (recent.data ?? []) as PropertyRecord[]
  };
}
