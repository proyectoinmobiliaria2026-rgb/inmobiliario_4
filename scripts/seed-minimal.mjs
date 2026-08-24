import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const seedEmail = process.env.SEED_AGENT_EMAIL ?? "seed.agent@cfdigital.local";
const seedPassword = process.env.SEED_AGENT_PASSWORD ?? "SeedAgent!123456";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function findOrCreateSeedUser() {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) {
    throw new Error(`Cannot list users: ${listed.error.message}`);
  }

  const found = listed.data.users.find((user) => user.email?.toLowerCase() === seedEmail.toLowerCase());
  if (found) {
    return found.id;
  }

  const created = await supabase.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
    user_metadata: {
      full_name: "Seed Agent"
    }
  });

  if (created.error || !created.data.user) {
    throw new Error(`Cannot create seed user: ${created.error?.message ?? "Unknown error"}`);
  }

  return created.data.user.id;
}

async function seedProperties(ownerId) {
  const existing = await supabase
    .from("properties")
    .select("id")
    .eq("created_by", ownerId)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Cannot check existing properties: ${existing.error.message}`);
  }

  if (existing.data) {
    return;
  }

  const { error } = await supabase.from("properties").insert([
    {
      created_by: ownerId,
      title: "Departamento semilla en Centro",
      description: "Seed inicial para validar CRUD de propiedades",
      property_type: "apartment",
      operation_type: "sale",
      status: "draft",
      city: "Monterrey",
      country: "MX",
      bedrooms: 2,
      bathrooms: 2,
      area_m2: 84,
      price_amount: 240000,
      price_currency: "USD"
    },
    {
      created_by: ownerId,
      title: "Casa semilla en zona norte",
      description: "Seed inicial para listado",
      property_type: "house",
      operation_type: "rent",
      status: "draft",
      city: "Monterrey",
      country: "MX",
      bedrooms: 3,
      bathrooms: 3,
      area_m2: 160,
      price_amount: 1800,
      price_currency: "USD"
    }
  ]);

  if (error) {
    throw new Error(`Cannot seed properties: ${error.message}`);
  }
}

const ownerId = await findOrCreateSeedUser();
await seedProperties(ownerId);

const output = {
  seedUserEmail: seedEmail,
  seedUserId: ownerId,
  generatedAt: new Date().toISOString()
};

await writeFile("supabase/seed-output.json", JSON.stringify(output, null, 2));

console.log("Seed completed");
console.log(JSON.stringify(output, null, 2));
