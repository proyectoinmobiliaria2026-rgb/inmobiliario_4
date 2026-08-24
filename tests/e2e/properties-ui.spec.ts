import { expect, test } from "@playwright/test";
import { cleanupPropertiesByTitlePrefix } from "./helpers";

const seedEmail = process.env.SEED_AGENT_EMAIL ?? "seed.agent@cfdigital.local";
const seedPassword = process.env.SEED_AGENT_PASSWORD ?? "SeedAgent!123456";

test("properties workbench UI flow with media", async ({ page }) => {
  await cleanupPropertiesByTitlePrefix(page.request, ["UI Test Depto"]);
  await page.goto("/properties");

  await page.getByLabel("Email").fill(seedEmail);
  await page.getByLabel("Password").fill(seedPassword);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  const sessionStatus = page.getByTestId("session-status");
  await expect(sessionStatus).toContainText(seedEmail);

  await page.getByRole("button", { name: "Renovar sesión" }).click();
  await expect(sessionStatus).toContainText(seedEmail);

  await page.getByRole("button", { name: "Crear propiedad" }).click();
  await expect(page.locator(".error-list")).toContainText("título");

  const form = page.getByTestId("property-form");
  const title = `UI Test Depto ${Date.now()}`;
  await form.getByLabel("Título").fill(title);
  await form.getByLabel("Descripción").fill("Descripción suficiente para validar publicación desde la UI");
  await form.getByLabel("Tipo de propiedad").selectOption("apartment");
  await form.getByLabel("Operación").selectOption("sale");
  await form.getByLabel("Dirección").fill("Calle UI 123");
  await form.getByLabel("Ciudad").fill("Monterrey");
  await form.getByLabel("País").fill("MX");
  await form.getByLabel("Precio").fill("180000");
  await page.getByRole("button", { name: "Crear propiedad" }).click();

  const row = page.locator(".property-row", { hasText: title });
  await expect(row).toBeVisible();

  await page.getByLabel("Búsqueda").fill(title);
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(row).toBeVisible();
  await expect(page.getByTestId("pagination")).toContainText("Página 1 de");
  await page.getByRole("button", { name: "Limpiar" }).click();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Media" }).click();
  const mediaPanel = page.getByTestId("media-panel");
  await expect(mediaPanel).toBeVisible();

  await page.getByLabel("Tipo de archivo").selectOption("image");
  await page.getByLabel("Estado del archivo").selectOption("original");
  await page.getByLabel("Archivo", { exact: true }).setInputFiles({
    name: "ui-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("ui-fake-image")
  });
  await page.getByRole("button", { name: "Subir archivo" }).click();

  const mediaRow = page.locator(".media-row");
  await expect(mediaRow).toBeVisible();
  await expect(mediaRow.locator("img.media-thumb")).toHaveCount(1);

  await mediaRow.getByRole("button", { name: "Marcar procesada" }).click();
  await expect(mediaRow).toContainText("processed");

  await mediaRow.getByRole("button", { name: "Eliminar media" }).click();
  await expect(page.locator(".media-row")).toHaveCount(0);

  await row.getByRole("button", { name: "Editar" }).click();
  await form.getByLabel("Estado de publicación").selectOption("published");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(row).toContainText("published");

  await row.getByRole("button", { name: "Eliminar propiedad" }).click();
  await expect(page.locator(".property-row", { hasText: title })).toHaveCount(0);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
});
