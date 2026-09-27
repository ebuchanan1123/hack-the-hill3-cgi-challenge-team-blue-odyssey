import { test, expect } from "@playwright/test";
test("Dashboard and account drawer", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/"); await expect(page).toHaveURL(/\/dashboard$/); await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(3);
  await page.getByRole("button", { name: "ACC-18492" }).click(); const dialog = page.getByRole("dialog"); await expect(dialog.getByRole("heading", { name: "Why flagged" })).toBeVisible();
  await dialog.getByText("View chart data", { exact: true }).click(); await expect(dialog.getByRole("cell", { name: "1270 kWh (estimate)" })).toBeVisible();
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(page.getByRole("button", { name: "ACC-18492" })).toBeFocused();
  await page.getByLabel("About pre-bill review", { exact: true }).click(); await expect(page.getByText("Customer-level usage history is simulated for this prototype.", { exact: false })).toBeVisible(); await page.getByLabel("About pre-bill review", { exact: true }).click(); await page.screenshot({ path: "artifacts/dashboard.png", fullPage: true }); expect(errors).toEqual([]);
});
test("Complaint filters, search, and details", async ({ page }) => {
  await page.goto("/complaints"); await expect(page.locator("tbody tr")).toHaveCount(7);
  await page.getByLabel("Priority", { exact: true }).selectOption("High"); await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByLabel("Status", { exact: true }).selectOption("Open"); await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Region", { exact: true }).selectOption("Barrowdale"); await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Search complaints").fill("missing"); await expect(page.getByText("No matching complaints")).toBeVisible(); await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Billing - estimated read"); await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Deadline", { exact: true }).selectOption("Overdue"); await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "COMP-1001" }).click(); const dialog = page.getByRole("dialog"); await expect(dialog.getByRole("heading", { name: "Why", exact: true })).toBeVisible(); await expect(dialog.getByText("This complaint is already 7 days overdue.")).toBeVisible(); await expect(dialog.getByText("7 days overdue", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/complaint-drawer.png", fullPage: true }); await page.getByRole("button", { name: "Close details" }).click(); await expect(dialog).not.toBeVisible();
});
test("Ask Pulse fixtures, evidence, assumptions and comparison", async ({ page }) => {
  await page.goto("/decision-twin"); await expect(page.getByRole("heading", { name: "Balanced intervention" })).toBeVisible(); await expect(page.getByRole("button", { name: "Ask Pulse", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Ask Pulse", exact: true }).fill("Invest $12M in a different region"); await page.getByRole("button", { name: "Ask Pulse", exact: true }).click();
  await page.getByLabel("Privacy", { exact: true }).click(); await expect(page.getByText("Pulse uses aggregated scenario outputs only. Raw customer data is never sent to the AI.", { exact: false })).toBeVisible(); expect(await page.locator(".info-body").evaluate(el => el.getBoundingClientRect().height <= 32)).toBe(true); await page.getByLabel("Privacy", { exact: true }).click();
  await page.getByRole("button", { name: "View assumptions" }).click(); await expect(page.getByRole("dialog").getByText("Cost to handle a complaint")).toBeVisible(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View evidence" }).click(); await expect(page.getByRole("dialog").getByText("64%", { exact: true })).toBeVisible(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Compare", exact: true }).click(); await expect(page.getByRole("dialog").getByRole("columnheader", { name: "Validation pilot" })).toBeVisible(); await page.keyboard.press("Escape");
  await page.screenshot({ path: "artifacts/decision-twin.png", fullPage: true });
  await page.getByRole("button", { name: "What if our budget is $500k?", exact: true }).click(); await expect(page.getByRole("heading", { name: "Validation pilot" })).toBeVisible();
});
test("Mobile routes and legacy redirect", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["dashboard", "complaints", "decision-twin"]) { await page.goto(`/${route}`); await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.getByLabel("Privacy", { exact: true }).click(); expect(await page.locator(".info-body").evaluate(el => el.getBoundingClientRect().height <= 32)).toBe(true);
  await page.goto("/operations"); await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "ACC-18492" }).click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true); await page.keyboard.press("Escape");
  await page.screenshot({ path: "artifacts/dashboard-mobile.png", fullPage: true });
});
