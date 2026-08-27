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
    title: input.title ?? null,
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
    amenities: input.amenities ?? [],
    rental_requirements: input.rentalRequirements ?? [],
    published_at: input.status === "active" ? new Date().toISOString() : null
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
  if (input.amenities !== undefined) payload.amenities = input.amenities;
  if (input.rentalRequirements !== undefined) payload.rental_requirements = input.rentalRequirements;

  return payload;
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
