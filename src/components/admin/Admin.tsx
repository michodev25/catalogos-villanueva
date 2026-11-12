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
  Trash2,
} from "lucide-react";
import { categories, formatMoney, type Product } from "../../lib/catalog";

const imageUrl = (product: Product) =>
  product.imagePath?.startsWith("demo/")
    ? `/${product.imagePath}`
    : `/media/${product.id}.webp?v=${encodeURIComponent(product.updatedAt)}`;
export default function Admin({
  products,
  currency,
  editId,
  demo,
}: {
  products: Product[];
  currency: string;
  editId?: string;
  demo: boolean;
}) {
  const existing = products.find((product) => product.id === editId);
  const [ready, setReady] = useState(false);
  const [product, setProduct] = useState<Product>(
    existing || {
      id: "",
      name: "",
      category: "paneles",
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setReady(true);
    if (!product.id)
      setProduct((current) => ({ ...current, id: crypto.randomUUID() }));
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
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
    if (file) form.set("image", file);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setProduct(result.product);
      setFile(null);
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
  return (
    <div className="admin-app" inert={!ready} aria-busy={!ready}>
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" width="35" height="35" />
          <span>villanueva.</span>
        </a>
        <span className="admin-label">Tu catálogo</span>
        <nav>
          <a className="active" href="/admin">
            <LayoutGrid size={19} /> Productos
          </a>
          <button onClick={() => setSettingsOpen(!settingsOpen)}>
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
        {!editId ? (
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
              <span>
                {products.length} productos ·{" "}
                {products.filter((item) => item.published).length} publicados
              </span>
              <label className="search-box">
                <Search size={18} />
                <input
                  placeholder="Buscar en tus productos…"
                  aria-label="Buscar productos para editar"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <div className="admin-products">
              {products
                .filter((item) =>
                  item.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((item) => (
                  <a
                    className="admin-product-row"
                    href={`/admin/productos/${item.id}`}
                    key={item.id}
                  >
                    <div className="admin-product-identity">
                      {item.imagePath ? (
                        <img
                          src={imageUrl(item)}
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
                    <span
                      className={`status-badge ${item.published ? "published" : ""}`}
                    >
                      {item.published
                        ? item.available
                          ? "Publicado"
                          : "Agotado"
                        : "Borrador"}
                    </span>
                    <ArrowUpRight size={18} />
                  </a>
                ))}
              {!products.length && (
                <div className="empty-state">
                  <ImagePlus size={32} />
                  <h2>Tu primer producto empieza aquí</h2>
                  <p>Añade una foto, el nombre y el precio para publicarlo.</p>
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
                className={`status-badge ${product.published ? "published" : ""}`}
              >
                {product.published ? "Publicado" : "Borrador"}
              </span>
            </div>
            <form className="product-form" onSubmit={save}>
              <fieldset
                className="form-fields"
                disabled={busy}
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
                  <section className="form-section">
                    <h2>Foto principal</h2>
                    <div className="photo-preview">
                      {preview || product.imagePath ? (
                        <img
                          src={preview || imageUrl(product)}
                          alt="Vista previa de la foto del producto"
                        />
                      ) : (
                        <div className="image-empty">
                          <ImagePlus size={36} />
                          <span>Tu producto, en primer plano</span>
                        </div>
                      )}
                    </div>
                    <label className="upload-label">
                      <ImagePlus size={18} />{" "}
                      {product.imagePath || file
                        ? "Cambiar foto"
                        : "Subir foto"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Subir foto del producto"
                        onChange={(event) => {
                          const selected = event.target.files?.[0];
                          if (selected && selected.size > 8 * 1024 * 1024) {
                            setMessage("La foto debe pesar menos de 8 MB.");
                            event.target.value = "";
                          } else setFile(selected || null);
                        }}
                      />
                    </label>
                    <p className="field-hint">JPG, PNG o WebP. Hasta 8 MB.</p>
                  </section>
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
                  <a className="secondary" href="/admin">
                    Volver
                  </a>
                  <button className="primary" disabled={busy || !product.id}>
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
