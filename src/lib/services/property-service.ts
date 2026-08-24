import type { CreatePropertyInput, PropertyRecord, UpdatePropertyInput } from "@/lib/types/property";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient;

export type PropertyFilters = {
  status?: string;
  propertyType?: string;
  operationType?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type PropertyListResult = {
  items: PropertyRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function toInsertPayload(input: CreatePropertyInput, userId: string) {
  return {
    created_by: userId,
    title: input.title,
    description: input.description ?? null,
    property_type: input.propertyType,
    operation_type: input.operationType,
    status: input.status ?? "draft",
    address_line: input.addressLine ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    country: input.country ?? null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    parking_spots: input.parkingSpots ?? null,
    area_m2: input.areaM2 ?? null,
    price_amount: input.priceAmount ?? null,
    price_currency: input.priceCurrency ?? "USD",
    published_at: input.status === "published" ? new Date().toISOString() : null
  };
}

function toUpdatePayload(input: UpdatePropertyInput) {
  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.propertyType !== undefined) payload.property_type = input.propertyType;
  if (input.operationType !== undefined) payload.operation_type = input.operationType;
  if (input.status !== undefined) payload.status = input.status;
  if (input.addressLine !== undefined) payload.address_line = input.addressLine;
  if (input.city !== undefined) payload.city = input.city;
  if (input.state !== undefined) payload.state = input.state;
  if (input.country !== undefined) payload.country = input.country;
  if (input.bedrooms !== undefined) payload.bedrooms = input.bedrooms;
  if (input.bathrooms !== undefined) payload.bathrooms = input.bathrooms;
  if (input.parkingSpots !== undefined) payload.parking_spots = input.parkingSpots;
  if (input.areaM2 !== undefined) payload.area_m2 = input.areaM2;
  if (input.priceAmount !== undefined) payload.price_amount = input.priceAmount;
  if (input.priceCurrency !== undefined) payload.price_currency = input.priceCurrency;

  return payload;
}

function assertPublishedRequirements(candidate: {
  title?: string | null;
  description?: string | null;
  price_amount?: number | null;
  city?: string | null;
  country?: string | null;
  address_line?: string | null;
}) {
  if (!candidate.title) {
    throw new Error("Cannot publish without title");
  }
  if (!candidate.description || candidate.description.trim().length < 20) {
    throw new Error("Cannot publish without description (min 20 chars)");
  }
  if (!candidate.price_amount || candidate.price_amount <= 0) {
    throw new Error("Cannot publish without a positive priceAmount");
  }
  if (!candidate.city || !candidate.country || !candidate.address_line) {
    throw new Error("Cannot publish without addressLine, city and country");
  }
}

export async function listProperties(
  supabase: AppSupabaseClient,
  filters: PropertyFilters
): Promise<PropertyListResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = filters.page * filters.pageSize - 1;

  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters.operationType) {
    query = query.eq("operation_type", filters.operationType);
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as PropertyRecord[],
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
  };
}

export async function getPropertyById(supabase: AppSupabaseClient, id: string): Promise<PropertyRecord | null> {
  const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PropertyRecord | null) ?? null;
}

export async function createProperty(
  supabase: AppSupabaseClient,
  userId: string,
  input: CreatePropertyInput
): Promise<PropertyRecord> {
  if (input.status === "published") {
    assertPublishedRequirements({
      title: input.title,
      description: input.description ?? null,
      price_amount: input.priceAmount ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      address_line: input.addressLine ?? null
    });
  }

  const { data, error } = await supabase
    .from("properties")
    .insert(toInsertPayload(input, userId))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PropertyRecord;
}

export async function updateProperty(
  supabase: AppSupabaseClient,
  id: string,
  input: UpdatePropertyInput
): Promise<PropertyRecord> {
  const payload = toUpdatePayload(input);
  if (Object.keys(payload).length === 0) {
    throw new Error("No fields provided for update");
  }

  if (input.status === "published") {
    const current = await getPropertyById(supabase, id);
    if (!current) {
      throw new Error("Property not found");
    }

    assertPublishedRequirements({
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      price_amount: input.priceAmount ?? current.price_amount,
      city: input.city ?? current.city,
      country: input.country ?? current.country,
      address_line: input.addressLine ?? current.address_line
    });

    if (current.status !== "published") {
      payload.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase.from("properties").update(payload).eq("id", id).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PropertyRecord;
}

export async function deleteProperty(supabase: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
