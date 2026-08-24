import { expect, test } from "@playwright/test";
import { cleanupPropertiesByTitlePrefix } from "./helpers";

const seedEmail = process.env.SEED_AGENT_EMAIL ?? "seed.agent@cfdigital.local";
const seedPassword = process.env.SEED_AGENT_PASSWORD ?? "SeedAgent!123456";

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test("publications CRUD, scheduling and scheduler run via API and UI", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: seedEmail, password: seedPassword }
  });
  expect(login.status(), await login.text()).toBe(200);

  await cleanupPropertiesByTitlePrefix(page.request, ["Pub e2e"]);

  const create = await page.request.post("/api/properties", {
    data: {
      title: `Pub e2e ${Date.now()}`,
      description: "Propiedad para probar publicaciones y scheduler",
      propertyType: "house",
      operationType: "rent",
      city: "Monterrey",
      priceAmount: 15000
    }
  });
  const createText = await create.text();
  expect(create.status(), createText).toBe(201);
  const propertyId = JSON.parse(createText).data.id as string;

  const invalidPlatform = await page.request.post("/api/publications", {
    data: { propertyId, platform: "tiktok", copy: "Copia" }
  });
  expect(invalidPlatform.status()).toBe(400);

  await page.goto("/publications");

  const form = page.getByTestId("publication-form");
  const propertySelect = form.getByLabel("Propiedad");
  const propertyOptionValue = await propertySelect.locator("option", { hasText: /Pub e2e/ }).getAttribute("value");
  expect(propertyOptionValue, "seed property should be listed in the selector").toBeTruthy();
  await propertySelect.selectOption(propertyOptionValue!);
  await form.getByLabel("Canal").selectOption("facebook");
  await form.getByLabel("Copia").fill("Casa en renta e2e para publicaciones");
  await form.getByRole("button", { name: "Crear borrador" }).click();

  await expect(page.locator(".notice", { hasText: "Borrador creado" })).toBeVisible();
  const list = page.getByTestId("publication-list");
  await expect(list.locator(".publication-row")).toHaveCount(1);
  await expect(list.locator(".publication-row .badge")).toHaveText("draft");

  const draftRow = list.locator(".publication-row").first();
  await draftRow.locator("input[type='datetime-local']").fill(toLocalInputValue(new Date(Date.now() - 60_000)));
  await draftRow.getByRole("button", { name: "Programar" }).click();
  await expect(list.locator(".publication-row .badge")).toHaveText("scheduled", { timeout: 10_000 });

  const secondPublication = await page.request.post("/api/publications", {
    data: { propertyId, platform: "whatsapp", copy: "Segunda publicacion e2e" }
  });
  expect(secondPublication.status(), await secondPublication.text()).toBe(201);

  await page.getByTestId("publication-filters").getByRole("button", { name: "Filtrar" }).click();
  await expect(list.locator(".publication-row")).toHaveCount(2);

  await page.getByTestId("scheduler-run").click();
  await expect(page.locator(".notice", { hasText: "Scheduler:" })).toBeVisible();
  await expect(list.locator(".publication-row", { hasText: "Casa en renta e2e" }).locator(".badge")).toHaveText("published", { timeout: 10_000 });

  const whatsappRow = list.locator(".publication-row", { hasText: "Segunda publicacion e2e" });
  await whatsappRow.getByRole("button", { name: "Cancelar" }).click();
  await expect(whatsappRow.locator(".badge")).toHaveText("cancelled", { timeout: 10_000 });

  await list.locator(".publication-row", { hasText: "Casa en renta e2e" }).getByRole("button", { name: "Eliminar" }).click();
  await expect(list.locator(".publication-row")).toHaveCount(1);
  await whatsappRow.getByRole("button", { name: "Eliminar" }).click();
  await expect(list.locator(".publication-row")).toHaveCount(0);

  const deleted = await page.request.delete(`/api/properties/${propertyId}`);
  expect(deleted.status(), await deleted.text()).toBe(200);
});
