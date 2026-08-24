import { expect, test, type APIRequestContext } from "@playwright/test";
import { cleanupPropertiesByTitlePrefix } from "./helpers";

const seedEmail = process.env.SEED_AGENT_EMAIL ?? "seed.agent@cfdigital.local";
const seedPassword = process.env.SEED_AGENT_PASSWORD ?? "SeedAgent!123456";

async function loginWithCookieSession(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", {
    data: {
      email: seedEmail,
      password: seedPassword
    }
  });

  expect(response.status(), await response.text()).toBe(200);
}

test("authenticated property CRUD via cookie session", async ({ page }) => {
  const api = page.request;
  await loginWithCookieSession(api);
  await cleanupPropertiesByTitlePrefix(api, ["Propiedad e2e autenticada"]);

  const createResponse = await api.post("/api/properties", {
    data: {
      title: "Propiedad e2e autenticada",
      description: "Descripcion base de prueba para propiedad autenticada",
      propertyType: "apartment",
      operationType: "sale",
      addressLine: "Calle 123",
      city: "Monterrey",
      country: "MX",
      priceAmount: 210000
    }
  });
  const createText = await createResponse.text();
  expect(createResponse.status(), createText).toBe(201);
  const createPayload = JSON.parse(createText);

  const propertyId = createPayload.data.id as string;

  const listResponse = await api.get("/api/properties");
  const listPayload = await listResponse.json();
  expect(listResponse.status()).toBe(200);
  expect(Array.isArray(listPayload.data.items)).toBeTruthy();
  expect(listPayload.data.total).toBeGreaterThanOrEqual(1);

  const updateResponse = await api.patch(`/api/properties/${propertyId}`, {
    data: {
      status: "published",
      description: "Descripcion extendida para validacion de publicacion",
      addressLine: "Calle 456",
      city: "Monterrey",
      country: "MX",
      priceAmount: 250000
    }
  });
  expect(updateResponse.status(), await updateResponse.text()).toBe(200);

  const deleteResponse = await api.delete(`/api/properties/${propertyId}`);
  expect(deleteResponse.status(), await deleteResponse.text()).toBe(200);
});

test("authenticated media CRUD via cookie session", async ({ page }) => {
  const api = page.request;
  await loginWithCookieSession(api);
  await cleanupPropertiesByTitlePrefix(api, ["Propiedad media e2e"]);

  const createProperty = await api.post("/api/properties", {
    data: {
      title: "Propiedad media e2e",
      description: "Descripcion para propiedad media e2e",
      propertyType: "house",
      operationType: "rent"
    }
  });
  const propertyText = await createProperty.text();
  expect(createProperty.status(), propertyText).toBe(201);
  const propertyPayload = JSON.parse(propertyText);
  const propertyId = propertyPayload.data.id as string;

  const mediaUpload = await api.post(`/api/properties/${propertyId}/media`, {
    multipart: {
      kind: "image",
      state: "original",
      file: {
        name: "photo.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-image-content")
      }
    }
  });
  const mediaText = await mediaUpload.text();
  expect(mediaUpload.status(), mediaText).toBe(201);
  const mediaPayload = JSON.parse(mediaText);
  const mediaId = mediaPayload.data.id as string;

  const patchMedia = await api.patch(`/api/properties/${propertyId}/media/${mediaId}`, {
    data: {
      state: "processed"
    }
  });
  expect(patchMedia.status(), await patchMedia.text()).toBe(200);

  const listMedia = await api.get(`/api/properties/${propertyId}/media`);
  const listMediaPayload = await listMedia.json();
  expect(listMedia.status()).toBe(200);
  expect(Array.isArray(listMediaPayload.data)).toBeTruthy();

  const deleteMedia = await api.delete(`/api/properties/${propertyId}/media/${mediaId}`);
  expect(deleteMedia.status(), await deleteMedia.text()).toBe(200);

  const deleteProperty = await api.delete(`/api/properties/${propertyId}`);
  expect(deleteProperty.status(), await deleteProperty.text()).toBe(200);
});
