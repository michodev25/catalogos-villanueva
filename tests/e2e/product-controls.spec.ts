import { test, expect, type Locator } from "@playwright/test";

async function layout(card: Locator) {
  return card.evaluate((element) => {
    const bounds = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      card: bounds(element),
      price: bounds(element.querySelector(".product-bottom > strong")!),
      control: bounds(element.querySelector(".add-button, .quantity")!),
    };
  });
}

for (const width of [320, 360, 390, 768, 810, 1024, 1440]) {
  test(`Agregar y cantidad conservan su posición a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.locator(".product-card .add-button").first(),
    ).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);

    for (const card of await page.locator(".product-card").all()) {
      await card.scrollIntoViewIfNeeded();
      const before = await layout(card);
      await card.getByRole("button", { name: /^Agregar / }).click();
      await expect(card.locator(".quantity output")).toHaveText("1");
      expect.soft(await layout(card)).toEqual(before);
      expect.soft(
        await card.locator(".quantity").evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);

      await card.getByRole("button", { name: /^Quitar una unidad/ }).click();
      await expect(card.locator(".add-button")).toBeVisible();
      expect.soft(await layout(card)).toEqual(before);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.locator(".product-card .add-button").first().click();
    await page.screenshot({
      path: `test-results/product-controls-${width}.png`,
      fullPage: true,
    });
  });
}

test("la cantidad conserva su espacio al pasar de 9 a 10", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "villanueva.cart.v1",
      JSON.stringify([{ productId: "demo-panel", quantity: 9 }]),
    );
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const card = page
    .locator(".product-card")
    .filter({ hasText: "Panel solar monocristalino" });
  await expect(card.locator(".quantity output")).toHaveText("9");
  await card.scrollIntoViewIfNeeded();
  const before = await layout(card);
  await card.getByRole("button", { name: /^Agregar una unidad/ }).click();
  await expect(card.locator(".quantity output")).toHaveText("10");
  expect(await layout(card)).toEqual(before);
});
