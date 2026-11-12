import { test, expect } from "@playwright/test";

test("mantiene visible la explicación cuando se agota toda la selección", async ({
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
    .getByRole("button", { name: "Abrir carrito, 1 artículos" })
    .click();
  await page.route("**/api/quote", (route) =>
    route.fulfill({
      json: {
        items: [],
        products: [],
        currency: "USD",
        subtotalMinor: 0,
        changes: ["Tira LED RGB está agotada."],
        whatsappUrl: null,
        message: "",
      },
    }),
  );
  await page.getByRole("button", { name: "Cotizar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Tira LED RGB está agotada.",
  );
});

test("protege una cotización pendiente frente a cambios de otra pestaña", async ({
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
    .getByRole("button", { name: "Abrir carrito, 1 artículos" })
    .click();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/quote", async (route) => {
    await gate;
    await route.fulfill({
      json: {
        items: [],
        products: [],
        currency: "USD",
        subtotalMinor: 0,
        changes: ["Cambio de prueba."],
        whatsappUrl: null,
        message: "",
      },
    });
  });
  await page.getByRole("button", { name: "Cotizar", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", {
        name: "Agregar una unidad de Tira LED RGB con control",
      }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "villanueva.cart.v1",
        newValue: '[{"productId":"demo-led","quantity":3}]',
      }),
    ),
  );
  release();
  await expect(page.getByRole("alert")).toContainText("selección cambió");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("status", { name: "Cantidad de Tira LED RGB con control" }),
  ).toHaveText("3");
});

test("el editor protege los cambios durante el guardado y conserva el formulario si falla", async ({
  page,
}) => {
  test.skip(!process.env.TEST_ADMIN_PASSWORD, "Requiere contraseña local.");
  await page.goto("/admin/login");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/productos/demo-led");
  await page.getByLabel("Nombre", { exact: true }).fill("Edición conservada");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/admin/products", async (route) => {
    await gate;
    await route.fulfill({
      status: 500,
      json: { error: "Error temporal de prueba." },
    });
  });
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText(
    "Error temporal de prueba.",
  );
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Edición conservada",
  );
  await expect(page.getByLabel("Nombre", { exact: true })).toBeEnabled();
});

test("la ficha móvil contiene textos largos sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto("/productos/demo-panel");
  const dialog = page.getByRole("dialog", {
    name: "Panel solar monocristalino",
  });
  await expect(dialog).toBeVisible();
  await dialog.locator(".detail-content > p").evaluate((element) => {
    element.textContent = "https://ejemplo.test/" + "producto".repeat(100);
  });
  await dialog
    .locator("dt")
    .first()
    .evaluate((element) => {
      element.textContent = "Característica".repeat(4);
    });
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});
