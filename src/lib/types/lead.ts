export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export type LeadRecord = {
  id: string;
  property_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  origin: string | null;
  status: LeadStatus;
  notes: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateLeadInput = {
  propertyId?: string;
  name: string;
  phone?: string;
  email?: string;
  origin?: string;
  status?: LeadStatus;
  notes?: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;
