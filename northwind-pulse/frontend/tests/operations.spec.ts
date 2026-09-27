import { test, expect } from "@playwright/test";

test("Operations and account drawer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/api/learning/summary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ complaintFeedbackCount: 0, resolvedComplaintCount: 0, accountReviewCount: 0, rootCauses: [], message: "Saved outcomes become feedback for future prevention and routing decisions." }) }));
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Operations", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(4);
  await page.getByRole("button", { name: "ACC-18492" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Why flagged" })).toBeVisible();
  await dialog.getByText("View chart data", { exact: true }).click();
  await expect(dialog.getByRole("cell", { name: "1270 kWh (estimate)" })).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "ACC-18492" })).toBeFocused();
  await page.getByLabel("About pre-bill review", { exact: true }).click();
  await expect(page.getByText("Customer-level usage history is simulated for this prototype.", { exact: false })).toBeVisible();
  await page.getByLabel("About pre-bill review", { exact: true }).click();
  await page.screenshot({ path: "artifacts/dashboard.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("Complaint filters, search, and details", async ({ page }) => {
  await page.goto("/complaints");
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await page.getByLabel("Priority", { exact: true }).selectOption("High");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByLabel("Status", { exact: true }).selectOption("Open");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Region", { exact: true }).selectOption("Barrowdale");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Search complaints").fill("missing");
  await expect(page.getByText("No matching complaints")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Billing - estimated read");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Deadline", { exact: true }).selectOption("Overdue");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "COMP-1001" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Complaint details", exact: true })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Recommended handling", exact: true })).toBeVisible();
  await expect(dialog.getByText("Transfer likelihood", { exact: true })).not.toBeVisible();
  await expect(dialog.getByText("7 days overdue", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/complaint-drawer.png", fullPage: true });
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(dialog).not.toBeVisible();
});

test("Decision Twin sends a brief, renders Gemini options, and asks grounded questions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.route("**/api/strategy/generate", async (route) => {
    const request = route.request().postDataJSON();
    expect(request.budgetUsd).toBe(125000);
    expect(request.horizonMonths).toBe(24);
    expect(request.objective).toBe("maximizeNetSavings");
    expect(request.priorities).toContain("estimated-read complaints");
    expect(request.interventions).toBeUndefined();

    const makeCase = (confidence: "CONSERVATIVE" | "BASE" | "UPSIDE", factor: number) => {
      const grossSavings = 32640 * factor;
      const netSavings = grossSavings - 2000;
      const horizonNetBenefit = netSavings * 2 - 25000;
      return {
        confidence,
        objective: "maximizeNetSavings",
        allocations: [{
          id: "targeted-validation", name: "Risk-based bill validation", allocationUsd: 25000,
          annualOperatingCostUsd: 2000, eligibleEventsPerYear: 2400, impactPercent: 20 * factor,
          impactKind: "complaints", eventLabel: "estimated-read complaints avoided", impactLabel: "Complaint reduction",
          overlapDiscountPercent: 0, estimatedEventsPerYear: 480 * factor, estimatedTransfersReducedPerYear: 0,
          standaloneAnnualGrossSavingsUsd: grossSavings, incrementalAnnualGrossSavingsUsd: grossSavings,
          source: "northwind_complaints.csv and northwind_unit_costs.csv", calculation: "2,400 × 20% × $68",
        }],
        budgetUsd: 125000, allocatedUsd: 25000, unallocatedBudgetUsd: 100000,
        estimatedComplaintsAvoidedPerYear: 480 * factor, estimatedTransfersReducedPerYear: 0,
        annualGrossSavingsUsd: grossSavings, annualOperatingCostUsd: 2000, annualNetSavingsUsd: netSavings,
        horizonMonths: 24, horizonNetBenefitUsd: horizonNetBenefit, roiPercent: horizonNetBenefit / 29000 * 100,
        paybackMonths: 25000 / netSavings * 12, overlapAssumptionPercent: 25,
        calculation: ["Gross less operating costs", "Net savings over horizon less investment"],
      };
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        currency: "USD", objective: "maximizeNetSavings", objectiveExplanation: "Maximize projected horizon net benefit.",
        budgetUsd: 125000, horizonMonths: 24, baselineObservedMonths: 24,
        confidenceStrategies: [makeCase("CONSERVATIVE", 0.5), makeCase("BASE", 1), makeCase("UPSIDE", 1.5)],
        userInputs: [],
        assumptions: ["Gemini does not calculate ROI; the backend computes these from the selected allocations, explicit effect assumptions, Northwind event counts, and unit costs."],
        dataLimitations: [],
        planningInputs: request,
        availableInterventionCount: 4,
        aiStrategy: {
          title: "Billing reliability first",
          summary: "Start with evidence-supported actions to improve billing reliability.",
          caveats: ["Effect ranges are planning assumptions."],
          recommendedInterventions: [{
            id: "targeted-validation", name: "Risk-based bill validation", description: "Validate estimated reads.",
            rationale: "Estimated-read complaints are a measurable eligible cohort.", suggestedAllocationPercent: 20,
            suggestedAllocationUsd: 25000, selectedInBaseCase: true, eligibleEventsPerYear: 2400,
            eventLabel: "estimated-read complaints", savingsPerEventUsd: 68,
            source: "northwind_complaints.csv and northwind_unit_costs.csv",
            impactAssumptionsPercent: { conservative: 10, base: 20, upside: 30 },
          }],
        },
      }),
    });
  });

  await page.route("**/api/ask-pulse", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      question: "How do transfers relate to resolution time?",
      answer: "Transferred cases took longer on average in the observed complaint data. This is an association, not proof of cause.",
      evidence: [{ id: "transfers.transferred.averageResolutionDays", label: "Transferred: average days to close", value: "38.24 days", source: "northwind_complaints.csv", period: null, evidenceType: "derivedMetric" }],
      caveats: ["This comparison does not establish causation."],
      suggestedFollowUps: ["Compare reopening rates"],
      grounding: "grounded",
    }),
  }));

  await page.goto("/decision-twin");
  await expect(page.getByRole("heading", { name: "Investment strategy generator" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  const budget = page.getByRole("spinbutton", { name: "Available investment budget in USD" });
  const horizon = page.getByRole("spinbutton", { name: "Planning horizon in months" });
  const operatingCost = page.getByRole("spinbutton", { name: "Annual operating cost budget in USD" });
  const overlap = page.getByRole("spinbutton", { name: "Portfolio benefit overlap percent" });
  const generateButton = page.getByRole("button", { name: "Generate investment strategy" });
  for (const field of [budget, horizon, operatingCost, overlap]) {
    await field.fill("");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(generateButton).toBeDisabled();
  }
  await budget.fill("125000");
  await horizon.fill("24");
  await operatingCost.fill("10000");
  await overlap.fill("25");
  await page.getByRole("textbox", { name: "Strategy priorities and constraints" }).fill("Prioritize estimated-read complaints and billing reliability.");
  await generateButton.click();
  await expect(page.getByRole("heading", { name: "Billing reliability first" }), errors.join("\n")).toBeVisible();
  await expect(page.getByText("Estimated-read complaints are a measurable eligible cohort.")).toBeVisible();
  await expect(page.getByText("$36.3K", { exact: true })).toBeVisible();
  await page.getByLabel("Scenario confidence case").selectOption("UPSIDE");
  await expect(page.getByText("$68.9K", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View assumptions" }).click();
  await expect(page.getByRole("dialog").getByText("Gemini does not calculate ROI; the backend computes these from the selected allocations, explicit effect assumptions, Northwind event counts, and unit costs.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View evidence & calculations" }).click();
  await expect(page.getByRole("dialog").getByText(/2,400 × 20% × \$68/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Compare cases" }).click();
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: "Upside" })).toBeVisible();
  await page.keyboard.press("Escape");
  const askLauncher = page.getByRole("button", { name: "Ask Pulse", exact: true });
  await expect(askLauncher).toBeVisible();
  await expect(askLauncher).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { name: "Ask Pulse" })).not.toBeVisible();
  await askLauncher.click();
  await expect(page.getByRole("heading", { name: "Ask Pulse" })).toBeVisible();
  await page.getByRole("textbox", { name: "Ask Pulse question" }).fill("How do transfers relate to resolution time?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("Evidence-grounded answer")).toBeVisible();
  await expect(page.getByText("38.24 days")).toBeVisible();
  await expect(page.getByText("This comparison does not establish causation.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(askLauncher).toHaveAttribute("aria-expanded", "false");
  await expect(askLauncher).toBeFocused();
  await page.screenshot({ path: "artifacts/decision-twin-live.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("Mobile routes and legacy redirect", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["dashboard", "complaints", "decision-twin"]) {
    await page.goto(`/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Ask Pulse", exact: true }).click();
  await page.getByLabel("Ask Pulse privacy and limits", { exact: true }).click();
  expect(await page.locator(".info-control[open] .info-body").evaluate(el => el.getBoundingClientRect().height > 0)).toBe(true);
  await page.goto("/operations");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "ACC-18492" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "artifacts/dashboard-mobile.png", fullPage: true });
});
