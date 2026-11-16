import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ImagePlus,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  Settings,
  Tags,
  Trash2,
} from "lucide-react";
import { formatMoney, productImageUrl, sortCategories, type Category, type Product } from "../../lib/catalog";
import ProductPhotos, { appendPhotoUploads, savedPhotos, type PhotoDraft } from "./ProductPhotos";

export default function Admin({
  products,
  currency,
  initialCategories,
  editId,
  demo,
  section = "products",
}: {
  products: Product[];
  currency: string;
  initialCategories: Category[];
  editId?: string;
  demo: boolean;
  section?: "products" | "categories";
}) {
  const existing = products.find((product) => product.id === editId);
  const [ready, setReady] = useState(false);
  const [product, setProduct] = useState<Product>(
    existing || {
      id: "",
      name: "",
      category: initialCategories[0]?.id ?? "",
      description: "",
      specifications: [],
      priceMinor: null,
      imagePath: null,
      published: false,
      available: true,
      updatedAt: "",
    },
  );
  const [price, setPrice] = useState(
    existing?.priceMinor == null ? "" : (existing.priceMinor / 100).toFixed(2),
  );
  const [photos, setPhotos] = useState<PhotoDraft[]>(() => savedPhotos(product));
  const [busy, setBusy] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryName, setCategoryName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string>();
  const [categoryFeedback, setCategoryFeedback] = useState<{ error: boolean; text: string }>();
  useEffect(() => {
    setReady(true);
    if (!product.id)
      setProduct((current) => ({ ...current, id: crypto.randomUUID() }));
  }, []);
  const update = <K extends keyof Product>(key: K, value: Product[K]) => {
    setProduct((current) => ({ ...current, [key]: value }));
    setMessage("");
  };
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);
    setNeedsLogin(false);
    const form = new FormData();
    for (const [key, value] of Object.entries({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      specifications: JSON.stringify(product.specifications),
      price,
      published: String(product.published),
      available: String(product.available),
      expectedUpdatedAt: product.updatedAt,
    }))
      form.set(key, value);
    try {
      await appendPhotoUploads(form, photos);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setProduct(result.product);
      setPhotos(savedPhotos(result.product));
      setSuccess(true);
      setMessage("Producto guardado.");
      history.replaceState(null, "", `/admin/productos/${result.product.id}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Comprueba tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function changeCurrency(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !confirm(
        "Cambiar la moneda modifica la etiqueta de todos los precios. Los importes no se convierten automáticamente. ¿Continuar?",
      )
    )
      return;
    const value = new FormData(event.currentTarget).get("currency");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: value }),
      });
      if (!response.ok) throw new Error();
      location.reload();
    } catch {
      setMessage("No se pudo cambiar la moneda. Vuelve a intentarlo.");
    }
  }
  const visibleProducts = products.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const publishedCount = visibleProducts.filter((item) => item.published).length;

  async function createCategory(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCategoryBusy(true);
    setCategoryFeedback(undefined);
    try {
      const response = await fetch("/api/admin/categories", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo crear la categoría.");
      setCategories((current) => sortCategories([...current, result.category]));
      setCategoryName("");
      setCategoryFeedback({ error: false, text: "Categoría creada." });
    } catch (error) {
      setCategoryFeedback({
        error: true,
        text: error instanceof Error ? error.message : "No se pudo crear la categoría.",
      });
    } finally {
      setCategoryBusy(false);
    }
  }

  async function removeCategory(category: Category) {
    if (!confirm(`¿Eliminar la categoría «${category.name}»?`)) return;

    const form = new FormData();
    form.set("id", category.id);
    setDeletingCategory(category.id);
    setCategoryFeedback(undefined);
    try {
      const response = await fetch("/api/admin/categories", { method: "DELETE", body: form });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "No se pudo eliminar la categoría.");
      }
      setCategories((current) => current.filter(({ id }) => id !== category.id));
      setCategoryFeedback({ error: false, text: "Categoría eliminada." });
    } catch (error) {
      setCategoryFeedback({
        error: true,
        text: error instanceof Error ? error.message : "No se pudo eliminar la categoría.",
      });
    } finally {
      setDeletingCategory(undefined);
    }
  }

  async function removeProduct() {
    const name = product.name || "Producto sin nombre";
    if (!confirm(`¿Eliminar «${name}» de forma permanente?`)) return;

    const form = new FormData();
    form.set("id", product.id);
    form.set("expectedUpdatedAt", product.updatedAt);
    setDeletingProduct(true);
    setMessage("");
    setSuccess(false);
    setNeedsLogin(false);
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE", body: form });
      if (!response.ok) {
        const result = await response.json();
        if (response.status === 401) setNeedsLogin(true);
        throw new Error(result.error || "No se pudo eliminar el producto.");
      }
      location.replace("/admin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar el producto.");
      setDeletingProduct(false);
    }
  }

  return (
    <div className="admin-app" inert={!ready} aria-busy={!ready}>
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          <img src="/villanueva-logo-v2.png" alt="" width="40" height="40" />
          <span>Villanueva</span>
        </a>
        <span className="admin-label">Tu catálogo</span>
        <nav aria-label="Administración del catálogo">
          <a className={section === "products" ? "active" : undefined} href="/admin">
            <LayoutGrid size={19} /> Productos
          </a>
          <a
            className={section === "categories" ? "active" : undefined}
            aria-current={section === "categories" ? "page" : undefined}
            href="/admin/categorias"
          >
            <Tags size={19} aria-hidden="true" /> Categorías
          </a>
          <button
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <Settings size={19} /> Configuración
          </button>
          <a href="/" target="_blank" rel="noreferrer">
            <ArrowUpRight size={19} /> Ver catálogo
          </a>
        </nav>
        <div className="admin-account">
          <span className="avatar">A</span>
          <div>
            <strong>Administrador</strong>
            <span>Cuenta privada</span>
          </div>
          <form method="POST" action="/api/admin/logout">
            <button className="icon-button" aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>
      <main id="contenido" className="admin-main">
        {demo && (
          <p className="admin-demo">
            Modo local · Los productos de ejemplo se pueden editar.
          </p>
        )}
        {settingsOpen && (
          <section className="settings-panel">
            <h2>Moneda del catálogo</h2>
            <form onSubmit={changeCurrency}>
              <label>
                Moneda
                <select name="currency" defaultValue={currency}>
                  <option>CUP</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
              <button className="primary">Guardar moneda</button>
            </form>
          </section>
        )}
        {section === "categories" ? (
          <>
            <div className="admin-heading">
              <div>
                <h1>Categorías</h1>
                <p>Organiza los productos y ayuda a tus clientes a encontrarlos.</p>
              </div>
            </div>
            <div className="admin-category-layout">
              <section className="form-section">
                <h2>Nueva categoría</h2>
                <form className="category-form" onSubmit={createCategory}>
                  <label>
                    Nombre de la categoría
                    <input
                      name="name"
                      value={categoryName}
                      onChange={(event) => setCategoryName(event.target.value)}
                      placeholder="Ej. Accesorios eléctricos"
                      maxLength={60}
                      required
                      readOnly={categoryBusy}
                    />
                  </label>
                  <button className="primary" disabled={categoryBusy || Boolean(deletingCategory)}>
                    <Plus size={18} aria-hidden="true" />
                    {categoryBusy ? "Creando…" : "Crear categoría"}
                  </button>
                </form>
              </section>
              <section className="form-section">
                <h2>Categorías de la tienda</h2>
                {categoryFeedback && (
                  <p
                    className={`feedback category-feedback ${categoryFeedback.error ? "" : "success"}`}
                    role={categoryFeedback.error ? "alert" : "status"}
                  >
                    {categoryFeedback.text}
                  </p>
                )}
                {categories.length === 0 && <p>Aún no hay categorías. Crea una para empezar.</p>}
                <ul className="admin-category-list">
                  {categories.map(({ id, name }) => (
                    <li key={id}>
                      <Tags size={17} aria-hidden="true" />
                      <span>{name}</span>
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label={`Eliminar categoría ${name}`}
                        title={`Eliminar categoría ${name}`}
                        disabled={categoryBusy || Boolean(deletingCategory)}
                        onClick={() => removeCategory({ id, name })}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : !editId ? (
          <>
            <div className="admin-heading">
              <div>
                <h1>Productos</h1>
                <p>Administra lo que tus clientes ven en el catálogo.</p>
              </div>
              <a className="primary" href="/admin/productos/nuevo">
                <Plus size={18} /> Nuevo producto
              </a>
            </div>
            <div className="admin-toolbar">
              <span role="status">
                {visibleProducts.length}{" "}
                {visibleProducts.length === 1 ? "producto" : "productos"} ·{" "}
                {publishedCount} {publishedCount === 1 ? "publicado" : "publicados"}
              </span>
              <label className="search-box">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar en tus productos…"
                  aria-label="Buscar productos para editar"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <div className="admin-products">
              {visibleProducts.map((item) => {
                const status = !item.published
                  ? "Borrador"
                  : item.available ? "Publicado" : "Agotado";
                return (
                  <a
                    className="admin-product-row"
                    href={`/admin/productos/${item.id}`}
                    key={item.id}
                  >
                    <div className="admin-product-identity">
                      {item.imagePath ? (
                        <img
                          src={productImageUrl(item, 0, true)}
                          alt=""
                          width="64"
                          height="64"
                        />
                      ) : (
                        <span className="admin-thumb">
                          <ImagePlus size={22} />
                        </span>
                      )}
                      <div>
                        <h2>{item.name || "Producto sin nombre"}</h2>
                        <span>
                          {
                            categories.find(
                              (category) => category.id === item.category,
                            )?.name
                          }
                        </span>
                      </div>
                    </div>
                    <strong>
                      {item.priceMinor == null
                        ? "Precio pendiente"
                        : formatMoney(item.priceMinor, currency)}
                    </strong>
                    <span className="status-badge" data-status={status}>
                      {status}
                    </span>
                    <ArrowUpRight size={18} />
                  </a>
                );
              })}
              {!products.length && (
                <div className="empty-state">
                  <ImagePlus size={32} />
                  <h2>Tu primer producto empieza aquí</h2>
                  <p>Añade una foto, el nombre y el precio para publicarlo.</p>
                </div>
              )}
              {products.length > 0 && visibleProducts.length === 0 && (
                <div className="empty-state">
                  <Search size={32} aria-hidden="true" />
                  <h2>No encontramos productos</h2>
                  <p>Prueba con otro nombre o vuelve a la lista completa.</p>
                  <button className="secondary" onClick={() => setQuery("")}>
                    Ver todos los productos
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <a className="text-link back-link" href="/admin">
              <ArrowLeft size={16} /> Todos los productos
            </a>
            <div className="admin-heading">
              <div>
                <h1>
                  {existing || product.updatedAt
                    ? "Editar producto"
                    : "Nuevo producto"}
                </h1>
                <p>La información que ayudará a tus clientes a elegir.</p>
              </div>
              <span
                className="status-badge"
                data-status={product.published ? "Publicado" : "Borrador"}
              >
                {product.published ? "Publicado" : "Borrador"}
              </span>
            </div>
            <form className="product-form" onSubmit={save}>
              <fieldset
                className="form-fields"
                disabled={busy || deletingProduct}
                aria-label="Editar producto"
              >
                <div className="form-main">
                  <section className="form-section">
                    <h2>Información del producto</h2>
                    <label>
                      Nombre
                      <input
                        value={product.name}
                        maxLength={120}
                        placeholder="Ej. Tira LED RGB de 5 metros"
                        onChange={(event) => update("name", event.target.value)}
                      />
                    </label>
                    <div className="field-pair">
                      <label>
                        Categoría
                        <select
                          value={product.category}
                          onChange={(event) =>
                            update("category", event.target.value)
                          }
                        >
                          {categories.length === 0 && <option value="">Sin categorías</option>}
                          {categories.map((item) => (
                            <option value={item.id} key={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Precio en {currency}
                        <input
                          inputMode="decimal"
                          value={price}
                          placeholder="0,00"
                          onChange={(event) => setPrice(event.target.value)}
                        />
                      </label>
                    </div>
                    {categories.length === 0 && (
                      <a className="text-link" href="/admin/categorias">Crear una categoría</a>
                    )}
                    <label>
                      Descripción
                      <textarea
                        value={product.description}
                        maxLength={4000}
                        rows={5}
                        placeholder="Cuenta qué incluye y qué necesita saber el cliente."
                        onChange={(event) =>
                          update("description", event.target.value)
                        }
                      />
                    </label>
                  </section>
                  <section className="form-section">
                    <h2>Especificaciones</h2>
                    <p className="field-hint">
                      Añade datos como potencia, longitud o autonomía.
                    </p>
                    {product.specifications.map((specification, index) => (
                      <div className="spec-row" key={index}>
                        <input
                          aria-label={`Característica ${index + 1}`}
                          value={specification.label}
                          maxLength={50}
                          required
                          placeholder="Potencia"
                          onChange={(event) =>
                            update(
                              "specifications",
                              product.specifications.map((item, i) =>
                                i === index
                                  ? { ...item, label: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <input
                          aria-label={`Valor ${index + 1}`}
                          value={specification.value}
                          maxLength={200}
                          required
                          placeholder="100 W"
                          onChange={(event) =>
                            update(
                              "specifications",
                              product.specifications.map((item, i) =>
                                i === index
                                  ? { ...item, value: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Eliminar característica ${index + 1}`}
                          onClick={() =>
                            update(
                              "specifications",
                              product.specifications.filter(
                                (_, i) => i !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="secondary"
                      type="button"
                      disabled={product.specifications.length >= 20}
                      onClick={() =>
                        update("specifications", [
                          ...product.specifications,
                          { label: "", value: "" },
                        ])
                      }
                    >
                      <Plus size={17} /> Añadir característica
                    </button>
                  </section>
                </div>
                <aside className="form-aside">
                  <ProductPhotos product={product} photos={photos} disabled={busy || deletingProduct}
                    onChange={(next) => {
                      setPhotos(next);
                      setMessage("");
                    }}
                    onError={(error) => {
                      setSuccess(false);
                      setMessage(error);
                    }}
                  />
                  <section className="form-section">
                    <h2>Visibilidad</h2>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={product.published}
                        onChange={(event) =>
                          update("published", event.target.checked)
                        }
                      />
                      <span>
                        Mostrar en el catálogo
                        <small>Desactívalo para guardar un borrador.</small>
                      </span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={product.available}
                        onChange={(event) =>
                          update("available", event.target.checked)
                        }
                      />
                      <span>
                        Disponible
                        <small>Desactívalo para mostrar «Agotado».</small>
                      </span>
                    </label>
                  </section>
                </aside>
                <div className="form-save">
                  {message && (
                    <p
                      role="alert"
                      className={`feedback ${success ? "success" : ""}`}
                    >
                      {success && <Check size={17} />} {message}
                      {needsLogin && (
                        <a
                          className="text-link"
                          href="/admin/login"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Entrar en otra pestaña
                        </a>
                      )}
                    </p>
                  )}
                  {product.updatedAt && (
                    <button
                      className="secondary danger delete-product"
                      type="button"
                      onClick={removeProduct}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                      {deletingProduct ? "Eliminando…" : "Eliminar producto"}
                    </button>
                  )}
                  <a className="secondary" href="/admin">
                    Volver
                  </a>
                  <button className="primary" disabled={busy || !product.id || !product.category}>
                    {busy ? "Guardando…" : "Guardar producto"}
                  </button>
                </div>
              </fieldset>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
