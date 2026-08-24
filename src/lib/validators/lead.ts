import type { CreateLeadInput, LeadStatus, UpdateLeadInput } from "@/lib/types/lead";

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`Expected string value for ${field}`);
  return value.trim();
}

function readDate(value: unknown, field: string): string | undefined {
  const result = readOptionalString(value, field);
  if (result === undefined) return undefined;
  if (Number.isNaN(Date.parse(result))) throw new Error(`${field} must be a valid date`);
  return result;
}

function validateCommon(input: {
  name?: string;
  phone?: string;
  email?: string;
  origin?: string;
  notes?: string;
  status?: LeadStatus;
}) {
  if (input.name !== undefined && (input.name.length < 2 || input.name.length > 120)) {
    throw new Error("name length must be between 2 and 120 characters");
  }
  if (input.phone !== undefined && input.phone.length > 40) throw new Error("phone is too long");
  if (input.email !== undefined) {
    if (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new Error("email must be valid");
    }
  }
  if (input.origin !== undefined && input.origin.length > 80) throw new Error("origin is too long");
  if (input.notes !== undefined && input.notes.length > 5000) throw new Error("notes is too long");
  if (input.status !== undefined && !LEAD_STATUSES.includes(input.status)) {
    throw new Error(`status must be one of: ${LEAD_STATUSES.join(", ")}`);
  }
}

function parseInput(payload: unknown, requireName: boolean, requireContact: boolean): CreateLeadInput {
  if (!isRecord(payload)) throw new Error("Invalid payload");

  const name = readOptionalString(payload.name, "name");
  const phone = readOptionalString(payload.phone, "phone");
  const email = readOptionalString(payload.email, "email");
  const origin = readOptionalString(payload.origin, "origin");
  const statusText = readOptionalString(payload.status, "status");
  const notes = readOptionalString(payload.notes, "notes");
  const propertyId = readOptionalString(payload.propertyId, "propertyId");
  const lastContactAt = readDate(payload.lastContactAt, "lastContactAt");
  const nextFollowUpAt = readDate(payload.nextFollowUpAt, "nextFollowUpAt");
  const status = statusText as LeadStatus | undefined;

  if (requireName && !name) throw new Error("name is required");
  if (requireName && name !== undefined && name.length < 2) {
    throw new Error("name length must be between 2 and 120 characters");
  }
  if (requireContact && !phone && !email) throw new Error("phone or email is required");
  validateCommon({ name, phone, email, origin, notes, status });

  return { propertyId, name: name ?? "", phone, email, origin, status, notes, lastContactAt, nextFollowUpAt };
}

export function parseCreateLeadInput(payload: unknown): CreateLeadInput {
  return parseInput(payload, true, true);
}

export function parseUpdateLeadInput(payload: unknown): UpdateLeadInput {
  if (!isRecord(payload) || Object.keys(payload).length === 0) throw new Error("No fields provided for update");
  const result = parseInput({ ...payload, name: payload.name ?? "Valid contact" }, false, false);
  return result;
}
