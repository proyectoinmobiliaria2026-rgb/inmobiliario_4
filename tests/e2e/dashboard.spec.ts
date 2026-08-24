import { expect, test } from "@playwright/test";
import { cleanupPropertiesByTitlePrefix } from "./helpers";

const seedEmail = process.env.SEED_AGENT_EMAIL ?? "seed.agent@cfdigital.local";
const seedPassword = process.env.SEED_AGENT_PASSWORD ?? "SeedAgent!123456";

test("dashboard renders real summary data", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: seedEmail, password: seedPassword }
  });
  expect(login.status(), await login.text()).toBe(200);

  await cleanupPropertiesByTitlePrefix(page.request, ["Dash Prop"]);

  const create = await page.request.post("/api/properties", {
    data: {
      title: `Dash Prop ${Date.now()}`,
      description: "Propiedad para verificar datos reales del dashboard",
      propertyType: "house",
      operationType: "rent"
    }
  });
  const createText = await create.text();
  expect(create.status(), createText).toBe(201);
  const propertyId = (JSON.parse(createText).data.id as string);

  const summaryResponse = await page.request.get("/api/dashboard/summary");
  expect(summaryResponse.status()).toBe(200);
  const summaryPayload = await summaryResponse.json();
  const totalBefore = summaryPayload.data.propertiesTotal as number;
  expect(totalBefore).toBeGreaterThanOrEqual(1);

  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-summary")).toBeVisible();
  await expect(page.getByTestId("stat-properties-total")).toHaveText(/\d+/);
  await expect(page.getByTestId("stat-media-total")).toHaveText(/\d+/);
  await expect(page.getByTestId("recent-published")).toBeVisible();

  const deleted = await page.request.delete(`/api/properties/${propertyId}`);
  expect(deleted.status(), await deleted.text()).toBe(200);
});
