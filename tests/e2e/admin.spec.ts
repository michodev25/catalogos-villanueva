import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("el administrador crea categorías y la tienda muestra filas adicionales", async ({
  page,
}) => {
  const password = process.env.TEST_ADMIN_PASSWORD;
  test.skip(!password, "Requiere contraseña local.");
  const prefix = `Prueba ${Date.now()}`;
  const names = ["Accesorios eléctricos", "Baterías", "Cables y conectores", "Repuestos", "Adaptadores"]
    .map((name) => `${name} ${prefix}`);

  await page.goto("/admin/login");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await page.getByRole("link", { name: "Categorías", exact: true }).click();
  const input = page.getByLabel("Nombre de la categoría");
  const create = page.getByRole("button", { name: "Crear categoría" });
  for (const name of names) {
    await input.fill(name);
    await create.click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await input.fill(names[0].toUpperCase().normalize("NFD").replace(/\p{M}/gu, ""));
  await create.click();
  await expect(page.getByRole("alert")).toHaveText("Ya existe una categoría con ese nombre.");

  await page.goto("/admin/productos/nuevo");
  const productName = `Borrador de categorías ${prefix}`;
  await page.getByLabel("Nombre", { exact: true }).fill(productName);
  const categorySelect = page.getByRole("combobox", { name: "Categoría", exact: true });
  await categorySelect.selectOption({ label: names[0] });
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByText("Producto guardado.")).toBeVisible();
  await page.reload();
  await expect(
    categorySelect.locator("option:checked"),
  ).toHaveText(names[0]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const filters = page.getByRole("group", { name: "Filtrar por categoría" });
  const first = filters.getByRole("button", { name: "Todos", exact: true });
  const last = filters.getByRole("button", { name: names.at(-1), exact: true });
  await expect(last).toBeVisible();
  expect((await last.boundingBox())!.y).toBeGreaterThan((await first.boundingBox())!.y);
  expect(await filters.evaluate((element) => element.scrollWidth)).toBe(
    await filters.evaluate((element) => element.clientWidth),
  );
  await last.click();
  await expect(page.getByRole("heading", { name: names.at(-1), exact: true })).toBeVisible();
  await expect(page.getByText("Aún no hay productos en esta categoría")).toBeVisible();

  await page.goto("/admin/categorias");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Eliminar categoría ${names[0]}`, exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Tiene productos asignados");

  await page.goto("/admin");
  await page.getByRole("link", { name: new RegExp(productName) }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Eliminar producto", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar producto", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: new RegExp(productName) })).toHaveCount(0);

  await page.goto("/admin/categorias");
  for (const name of names) {
    const remove = page.getByRole("button", { name: `Eliminar categoría ${name}`, exact: true });
    page.once("dialog", (dialog) => dialog.accept());
    await remove.click();
    await expect(remove).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByText(names[0], { exact: true })).toHaveCount(0);
  await page.goto("/");
  await expect(filters.getByRole("button", { name: names[0], exact: true })).toHaveCount(0);
});

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
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar producto", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: /Lámpara de prueba/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/admin\/login/);
});

test("las tres fotos se publican en el orden elegido y se pueden retirar", async ({ page, request }) => {
  const password = process.env.TEST_ADMIN_PASSWORD;
  test.skip(!password, "Configura TEST_ADMIN_PASSWORD para verificar el editor.");
  await page.goto("/admin");
  await page.getByLabel("Contraseña", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await page.getByRole("link", { name: "Nuevo producto" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Producto con galería");
  await page.getByLabel("Precio en USD", { exact: true }).fill("25");
  const files = await Promise.all(["lamp.jpg", "solar.jpg", "led.jpg"].map(async (name) => ({
    name,
    mimeType: "image/jpeg",
    // Keep valid JPEGs while exercising a batch larger than the Vercel request limit.
    buffer: Buffer.concat([await readFile(`public/demo/${name}`), Buffer.alloc(1_550_000)]),
  })));
  const upload = page.getByLabel("Subir foto del producto");
  await upload.setInputFiles(files);
  await expect(page.getByRole("button", { name: "Quitar foto 3" })).toBeVisible();
  await expect(upload).toBeDisabled();
  const save = async () => {
    const response = page.waitForResponse((response) =>
      response.url().endsWith("/api/admin/products") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Guardar producto" }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBe(200);
    await expect(page.getByText("Producto guardado.")).toBeVisible();
  };
  await page.getByLabel("Mostrar en el catálogo").check();
  await save();
  const editUrl = page.url();
  const id = editUrl.split("/").at(-1);
  const media = (position: number) => request.get(`/media/${id}.webp?photo=${position}`);
  const original = await Promise.all([1, 2, 3].map(async (position) => {
    const photo = await media(position);
    expect(photo.status()).toBe(200);
    return photo.body();
  }));
  expect(original[0].equals(original[2])).toBe(false);

  await page.reload();
  await page.getByRole("button", { name: "Adelantar foto 3" }).click();
  await page.getByRole("button", { name: "Adelantar foto 2" }).click();
  await save();
  expect((await (await media(1)).body()).equals(original[2])).toBe(true);
  expect((await (await media(2)).body()).equals(original[0])).toBe(true);
  expect((await (await media(3)).body()).equals(original[1])).toBe(true);

  await page.goto(`/productos/${id}`);
  const detail = page.getByRole("dialog", { name: "Producto con galería" });
  await expect(detail.getByRole("button", { name: "Ver foto 1" })).toHaveAttribute("aria-pressed", "true");
  await detail.getByRole("button", { name: "Ver foto 2" }).click();
  await expect(detail.locator(".detail-photo")).toHaveAttribute("src", /[?&]photo=2/);

  await page.goto(editUrl);
  await page.getByRole("button", { name: "Quitar foto 2" }).click();
  await save();
  expect((await media(3)).status()).toBe(404);
  expect((await (await media(2)).body()).equals(original[1])).toBe(true);
  await page.getByLabel("Mostrar en el catálogo").uncheck();
  await save();
  expect((await media(2)).status()).toBe(404);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar producto", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
