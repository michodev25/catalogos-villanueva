import { test, expect } from "@playwright/test";

test("carrito, persistencia y Cotizar con mensaje al número correcto", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Agregar Tira LED RGB con control",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Agregar una unidad de Tira LED RGB con control",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Abrir carrito, 2 artículos" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir carrito, 2 artículos" })
    .click();
  await expect(
    page.getByRole("button", { name: "Cotizar", exact: true }),
  ).toBeVisible();
  let quote: { subtotalMinor: number; whatsappUrl: string } | undefined;
  await page.screenshot({
    path: "test-results/cart-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/cart-mobile.png",
    fullPage: true,
  });
  await page.route("**/api/quote", async (route) => {
    const response = await route.fetch();
    quote = await response.json();
    await route.fulfill({ response });
  });
  await page.route("https://wa.me/**", (route) =>
    route.fulfill({
      body: "<p>WhatsApp intercepted for test</p>",
      contentType: "text/html",
    }),
  );
  await page.getByRole("button", { name: "Cotizar", exact: true }).click();
  await expect(page).toHaveURL(/wa.me\/5359159122/);
  expect(quote?.subtotalMinor).toBe(700000);
  expect(quote?.whatsappUrl).toContain("https://wa.me/5359159122?text=");
});

test("filtros, estados vacíos y teclado", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Lámparas solares", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Buscar productos" })
    .fill("no-existe");
  await expect(page.getByText("No encontramos ese producto")).toBeVisible();
  await page
    .getByRole("button", { name: "Ver todos los productos", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Ver Panel solar monocristalino",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Panel solar monocristalino" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const width of [360, 390, 768, 1440]) {
  test(`catálogo sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await page.locator(".product-card").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/catalog-${width}.png`,
      fullPage: true,
    });
  });
}

test("API impide edición anónima y rechaza cantidades adulteradas", async ({
  request,
}) => {
  const denied = await request.post("/api/admin/products", {
    headers: { Origin: "http://127.0.0.1:4321" },
    multipart: { name: "No autorizado" },
  });
  expect(denied.status()).toBe(401);
  const badQuote = await request.post("/api/quote", {
    data: {
      items: [{ productId: "demo-led", quantity: -1 }],
      displayedPrices: {},
      displayedCurrency: "USD",
    },
  });
  expect(badQuote.status()).toBe(400);
});
