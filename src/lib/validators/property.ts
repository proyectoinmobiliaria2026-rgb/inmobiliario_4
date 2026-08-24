import type { CreatePropertyInput, PropertyStatus, UpdatePropertyInput } from "@/lib/types/property";

const PROPERTY_STATUSES: PropertyStatus[] = ["draft", "published", "archived"];
const PROPERTY_TYPES = ["apartment", "house", "land", "office", "commercial"] as const;
const OPERATION_TYPES = ["sale", "rent", "temporary_rent"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error("Expected string value");
  }
  return value.trim();
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Expected numeric value");
  }
  return parsed;
}

function assertNonNegativeInteger(value: number | undefined, field: string) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
}

function assertNonNegativeNumber(value: number | undefined, field: string) {
  if (value === undefined) return;
  if (value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
}

function validatePropertyType(value: string) {
  if (!PROPERTY_TYPES.includes(value as (typeof PROPERTY_TYPES)[number])) {
    throw new Error(`propertyType must be one of: ${PROPERTY_TYPES.join(", ")}`);
  }
}

function validateOperationType(value: string) {
  if (!OPERATION_TYPES.includes(value as (typeof OPERATION_TYPES)[number])) {
    throw new Error(`operationType must be one of: ${OPERATION_TYPES.join(", ")}`);
  }
}

function validateBusinessFieldRanges(input: {
  title?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  areaM2?: number;
  priceAmount?: number;
}) {
  if (input.title !== undefined) {
    if (input.title.length < 5 || input.title.length > 120) {
      throw new Error("title length must be between 5 and 120 characters");
    }
  }

  assertNonNegativeInteger(input.bedrooms, "bedrooms");
  assertNonNegativeInteger(input.bathrooms, "bathrooms");
  assertNonNegativeInteger(input.parkingSpots, "parkingSpots");
  assertNonNegativeNumber(input.areaM2, "areaM2");
  assertNonNegativeNumber(input.priceAmount, "priceAmount");
}

export function parseCreatePropertyInput(payload: unknown): CreatePropertyInput {
  if (!isRecord(payload)) {
    throw new Error("Invalid payload");
  }

  const title = readOptionalString(payload.title);
  const propertyType = readOptionalString(payload.propertyType);
  const operationType = readOptionalString(payload.operationType);

  if (!title) {
    throw new Error("title is required");
  }
  if (!propertyType) {
    throw new Error("propertyType is required");
  }
  if (!operationType) {
    throw new Error("operationType is required");
  }

  validatePropertyType(propertyType);
  validateOperationType(operationType);

  const statusText = readOptionalString(payload.status);
  const status = statusText ? (statusText as PropertyStatus) : "draft";
  if (!PROPERTY_STATUSES.includes(status)) {
    throw new Error("status must be one of: draft, published, archived");
  }

  const result = {
    title,
    description: readOptionalString(payload.description),
    propertyType,
    operationType,
    status,
    addressLine: readOptionalString(payload.addressLine),
    city: readOptionalString(payload.city),
    state: readOptionalString(payload.state),
    country: readOptionalString(payload.country),
    bedrooms: readOptionalNumber(payload.bedrooms),
    bathrooms: readOptionalNumber(payload.bathrooms),
    parkingSpots: readOptionalNumber(payload.parkingSpots),
    areaM2: readOptionalNumber(payload.areaM2),
    priceAmount: readOptionalNumber(payload.priceAmount),
    priceCurrency: readOptionalString(payload.priceCurrency)
  };

  validateBusinessFieldRanges(result);
  return result;
}

export function parseUpdatePropertyInput(payload: unknown): UpdatePropertyInput {
  if (!isRecord(payload)) {
    throw new Error("Invalid payload");
  }

  const statusText = readOptionalString(payload.status);
  if (statusText && !PROPERTY_STATUSES.includes(statusText as PropertyStatus)) {
    throw new Error("status must be one of: draft, published, archived");
  }

  const propertyType = readOptionalString(payload.propertyType);
  const operationType = readOptionalString(payload.operationType);
  if (propertyType !== undefined && propertyType !== "") {
    validatePropertyType(propertyType);
  }
  if (operationType !== undefined && operationType !== "") {
    validateOperationType(operationType);
  }

  const result = {
    title: readOptionalString(payload.title),
    description: readOptionalString(payload.description),
    propertyType,
    operationType,
    status: statusText as PropertyStatus | undefined,
    addressLine: readOptionalString(payload.addressLine),
    city: readOptionalString(payload.city),
    state: readOptionalString(payload.state),
    country: readOptionalString(payload.country),
    bedrooms: readOptionalNumber(payload.bedrooms),
    bathrooms: readOptionalNumber(payload.bathrooms),
    parkingSpots: readOptionalNumber(payload.parkingSpots),
    areaM2: readOptionalNumber(payload.areaM2),
    priceAmount: readOptionalNumber(payload.priceAmount),
    priceCurrency: readOptionalString(payload.priceCurrency)
  };

  validateBusinessFieldRanges(result);
  return result;
}
