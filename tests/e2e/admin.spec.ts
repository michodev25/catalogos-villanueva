import { test, expect } from "@playwright/test";

test("administrador publica, edita y oculta un producto con foto", async ({
  page,
  request,
}) => {
  const password = process.env.TEST_ADMIN_PASSWORD;
  test.skip(
    !password,
    "Configura TEST_ADMIN_PASSWORD para verificar el acceso real local.",
  );
  async function saveProduct() {
    const responsePromise = page.waitForResponse("/api/admin/products");
    await page.getByRole("button", { name: "Guardar producto" }).click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(200);
    await expect(
      page.getByText("Producto guardado.", { exact: false }),
    ).toBeVisible();
  }
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await page.screenshot({ path: "test-results/login.png", fullPage: true });
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await expect(
    page.getByRole("heading", { name: "Productos", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Nuevo producto" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Lámpara de prueba");
  await page.getByLabel("Precio en USD", { exact: true }).fill("19,99");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Producto temporal creado por la prueba automática.");
  await page
    .getByLabel("Subir foto del producto")
    .setInputFiles("public/demo/lamp.jpg");
  await page.getByLabel("Mostrar en el catálogo", { exact: false }).check();
  await saveProduct();
  await expect(
    page.getByText("Producto guardado.", { exact: false }),
  ).toBeVisible();
  const id = page.url().split("/").pop();
  const quote = await request.post("/api/quote", {
    data: {
      items: [{ productId: id, quantity: 2 }],
      displayedPrices: { [id!]: 1 },
      displayedCurrency: "USD",
    },
  });
  expect((await quote.json()).whatsappUrl).toBeNull();
  await page.getByLabel("Disponible", { exact: false }).uncheck();
  await saveProduct();
  await expect(
    page.getByText("Producto guardado.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/admin-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Mostrar en el catálogo", { exact: false }).uncheck();
  await saveProduct();
  await expect(
    page.getByText("Producto guardado.", { exact: false }),
  ).toBeVisible();
  expect((await request.get(`/productos/${id}`)).status()).toBe(404);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/admin\/login/);
});
