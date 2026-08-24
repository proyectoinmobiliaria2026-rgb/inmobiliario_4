import { expect, test } from "@playwright/test";

test("home renders CFDIGITAL title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CFDIGITAL" })).toBeVisible();
});
