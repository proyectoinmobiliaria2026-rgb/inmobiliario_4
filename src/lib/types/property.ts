export type PropertyStatus = "draft" | "published" | "archived";

export type PropertyRecord = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  property_type: string;
  operation_type: string;
  status: PropertyStatus;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  area_m2: number | null;
  price_amount: number | null;
  price_currency: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePropertyInput = {
  title: string;
  description?: string;
  propertyType: string;
  operationType: string;
  status?: PropertyStatus;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  areaM2?: number;
  priceAmount?: number;
  priceCurrency?: string;
};

export type UpdatePropertyInput = Partial<Omit<CreatePropertyInput, "createdBy">>;
