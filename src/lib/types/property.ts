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
  amenities: string[] | null;
  rental_requirements: string[] | null;
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
  amenities?: string[];
  rentalRequirements?: string[];
};

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

export const PROPERTY_TYPES = ["apartment", "house", "land", "office", "commercial"] as const;
export const OPERATION_TYPES = ["sale", "rent", "temporary_rent"] as const;
export const PROPERTY_STATUSES: PropertyStatus[] = ["draft", "published", "archived"];

export const AMENITY_OPTIONS = [
  "roof_garden",
  "vigilancia_24_7",
  "lavanderia",
  "salon_de_eventos",
  "gimnasio",
  "alberca",
  "asador",
  "area_de_juegos",
  "pet_friendly",
  "jardin",
  "elevador",
  "cisterna"
] as const;

export const RENTAL_REQUIREMENT_OPTIONS = ["sin_aval", "aval_con_inmueble", "dos_depositos"] as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Departamento",
  house: "Casa",
  land: "Terreno",
  office: "Oficina",
  commercial: "Local comercial"
};

export const OPERATION_TYPE_LABELS: Record<string, string> = {
  sale: "Venta",
  rent: "Renta",
  temporary_rent: "Renta temporal"
};

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicada",
  archived: "Archivada"
};

export const AMENITY_LABELS: Record<string, string> = {
  roof_garden: "Roof garden",
  vigilancia_24_7: "Vigilancia 24 horas",
  lavanderia: "Lavandería",
  salon_de_eventos: "Salón de eventos",
  gimnasio: "Gimnasio",
  alberca: "Alberca",
  asador: "Zona de asador",
  area_de_juegos: "Área de juegos",
  pet_friendly: "Pet friendly",
  jardin: "Jardín",
  elevador: "Elevador",
  cisterna: "Cisterna"
};

export const RENTAL_REQUIREMENT_LABELS: Record<string, string> = {
  sin_aval: "Sin aval",
  aval_con_inmueble: "Aval con inmueble",
  dos_depositos: "2 depósitos + aval con inmueble"
};
