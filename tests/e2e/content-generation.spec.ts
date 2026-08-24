import { expect, test } from "@playwright/test";
import { cleanupPropertiesByTitlePrefix } from "./helpers";

const seedEmail = process.env.SEED_AGENT_EMAIL ?? "seed.agent@cfdigital.local";
const seedPassword = process.env.SEED_AGENT_PASSWORD ?? "SeedAgent!123456";

test("AI content generation via API and UI", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: seedEmail, password: seedPassword }
  });
  expect(login.status(), await login.text()).toBe(200);

  await cleanupPropertiesByTitlePrefix(page.request, ["AI Prop"]);

  const create = await page.request.post("/api/properties", {
    data: {
      title: `AI Prop ${Date.now()}`,
      description: "Propiedad para probar generacion de contenido con IA",
      propertyType: "apartment",
      operationType: "sale",
      city: "Monterrey",
      priceAmount: 195000
    }
  });
  const createText = await create.text();
  expect(create.status(), createText).toBe(201);
  const propertyId = JSON.parse(createText).data.id as string;

  const generated = await page.request.post(`/api/properties/${propertyId}/generate-content`, {
    data: { channel: "instagram" }
  });
  const generatedText = await generated.text();
  expect(generated.status(), generatedText).toBe(201);

  const generation = JSON.parse(generatedText).data;
  expect(generation.channel).toBe("instagram");
  expect(generation.provider).toBe("mock");
  expect(generation.output.copy.length).toBeGreaterThan(0);
  expect(generation.output.hashtags.length).toBeGreaterThan(0);
  expect(generation.output.cta.length).toBeGreaterThan(0);

  const invalid = await page.request.post(`/api/properties/${propertyId}/generate-content`, {
    data: { channel: "tiktok" }
  });
  expect(invalid.status()).toBe(400);

  const list = await page.request.get(`/api/properties/${propertyId}/generations`);
  const listPayload = await list.json();
  expect(list.status()).toBe(200);
  expect(listPayload.data.length).toBeGreaterThanOrEqual(1);

  await page.goto("/properties");
  const row = page.locator(".property-row", { hasText: "AI Prop" }).first();
  await row.getByRole("button", { name: "Contenido" }).click();

  const contentPanel = page.getByTestId("content-panel");
  await expect(contentPanel).toBeVisible();

  await contentPanel.getByLabel("Canal").selectOption("whatsapp");
  await contentPanel.getByRole("button", { name: "Generar copy" }).click();

  const generationRows = page.locator(".generation-row");
  await expect(generationRows.first()).toBeVisible();
  await expect(generationRows.first()).toContainText("Responde este mensaje");

  const deleted = await page.request.delete(`/api/properties/${propertyId}`);
  expect(deleted.status(), await deleted.text()).toBe(200);
});
