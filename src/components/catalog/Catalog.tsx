import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Grid2X2,
  LampWallUp,
  Lightbulb,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  SolarPanel,
  Tag,
  X,
  Zap,
} from "lucide-react";
import WhatsAppIcon from "../WhatsAppIcon";
import {
  formatMoney,
  readCart,
  setQuantity,
  type Product,
  type Category,
  type CartItem,
  type Quote,
} from "../../lib/catalog";

const storageKey = "villanueva.cart.v1";
const categoryIcons = new Map([
  ["todos", Grid2X2],
  ["paneles", SolarPanel],
  ["led", Zap],
  ["lamparas", LampWallUp],
]);
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const photo = (product: Product) =>
  product.imagePath?.startsWith("demo/")
    ? `/${product.imagePath}`
    : `/media/${product.id}.webp?v=${encodeURIComponent(product.updatedAt)}`;

export default function Catalog({
  initialProducts,
  initialCurrency,
  categories,
  initialProductId,
}: {
  initialProducts: Product[];
  initialCurrency: string;
  categories: Category[];
  initialProductId?: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [currency, setCurrency] = useState(initialCurrency);
  const [cart, setCart] = useState<CartItem[]>([]);
  const latestCart = useRef(cart);
  latestCart.current = cart;
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [cartOpen, setCartOpen] = useState(false);
  const [detail, setDetail] = useState<Product | null>(
    initialProducts.find((p) => p.id === initialProductId) || null,
  );
  const [notice, setNotice] = useState("");
  const [quoteNotice, setQuoteNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [longMessage, setLongMessage] = useState("");
  const cartDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const catalogHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      setCart(readCart(localStorage.getItem(storageKey)));
    } catch {
      setNotice("Tu selección durará mientras mantengas esta página abierta.");
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) {
        latestCart.current = readCart(event.newValue);
        setCart(latestCart.current);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      } catch {
        setNotice("No se pudo guardar la selección en este navegador.");
      }
  }, [cart, ready]);
  useEffect(() => {
    cartOpen ? cartDialog.current?.showModal() : cartDialog.current?.close();
  }, [cartOpen]);
  useEffect(() => {
    detail ? detailDialog.current?.showModal() : detailDialog.current?.close();
  }, [detail]);
  const query = normalize(search.trim());
  const categoryFilters = [{ id: "todos", name: "Todos" }, ...categories];
  const categoryTitle = categories.find(({ id }) => id === category)?.name;
  const visible = products.filter(
    (product) =>
      (category === "todos" || product.category === category) &&
      normalize(product.name).includes(query),
  );
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, line) =>
      sum +
      (products.find((product) => product.id === line.productId)?.priceMinor ||
        0) *
        line.quantity,
    0,
  );
  const change = (id: string, amount: number) => {
    if (busy) return;
    const quantity = cart.find((item) => item.productId === id)?.quantity || 0;
    if (quantity + amount > 99 || (!quantity && cart.length >= 50)) {
      setNotice("Has alcanzado el límite de esta selección.");
      return;
    }
    setCart((current) => setQuantity(current, id, quantity + amount));
    setQuoteNotice("");
    setLongMessage("");
    setNotice(
      amount > 0
        ? "Producto agregado a tu selección."
        : "Cantidad actualizada.",
    );
  };
  const quantityControl = (product: Product) => {
    const count =
      cart.find((item) => item.productId === product.id)?.quantity || 0;
    if (!product.available) return <span className="sold-out">Agotado</span>;
    return count ? (
      <div className="quantity">
        <button
          type="button"
          aria-label={`Agregar una unidad de ${product.name}`}
          onClick={() => change(product.id, 1)}
          disabled={busy || count >= 99}
        >
          <Plus size={17} />
        </button>
        <output aria-label={`Cantidad de ${product.name}`}>{count}</output>
        <button
          type="button"
          aria-label={`Quitar una unidad de ${product.name}`}
          disabled={busy}
          onClick={() => change(product.id, -1)}
        >
          <Minus size={17} />
        </button>
      </div>
    ) : (
      <button
        className="add-button"
        disabled={busy}
        onClick={() => change(product.id, 1)}
        aria-label={`Agregar ${product.name}`}
      >
        <ShoppingCart size={17} aria-hidden="true" /> Agregar
      </button>
    );
  };

  async function quote() {
    const selection = JSON.stringify(cart);
    setBusy(true);
    setQuoteNotice("");
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          displayedPrices: Object.fromEntries(
            products.map((p) => [p.id, p.priceMinor]),
          ),
          displayedCurrency: currency,
        }),
      });
      const result = (await response.json()) as Quote & {
        error?: string;
        products: Product[];
      };
      if (!response.ok)
        throw new Error(result.error || "No se pudo preparar la cotización.");
      if (JSON.stringify(latestCart.current) !== selection) {
        setQuoteNotice(
          "Tu selección cambió en otra pestaña. Revísala y vuelve a cotizar.",
        );
        return;
      }
      setProducts(result.products);
      setCurrency(result.currency);
      if (result.changes.length) {
        setCart(
          result.items.map(({ productId, quantity }) => ({
            productId,
            quantity,
          })),
        );
        setQuoteNotice(
          `${result.changes.join(" ")} Revisa la selección y vuelve a cotizar.`,
        );
      } else if (result.whatsappUrl) {
        if (result.whatsappUrl.length > 7000) setLongMessage(result.message);
        else window.location.assign(result.whatsappUrl);
      }
    } catch (error) {
      setQuoteNotice(
        error instanceof Error
          ? error.message
          : "Comprueba tu conexión y vuelve a intentarlo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="site-top">
        <header className="site-header shell">
          <a className="brand" href="/" aria-label="Villanueva, inicio">
            <img src="/villanueva-logo.png" alt="" width="44" height="44" />
            <span>Villanueva</span>
          </a>
          <form
            className="store-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              catalogHeading.current?.focus({ preventScroll: true });
              catalogHeading.current?.scrollIntoView({ block: "nearest" });
            }}
          >
            <input
              type="search"
              placeholder="Buscar en Villanueva"
              aria-label="Buscar productos"
              disabled={!ready}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Buscar en el catálogo"
              disabled={!ready}
            >
              <Search size={21} aria-hidden="true" />
            </button>
          </form>
          <button
            className="header-cart"
            disabled={!ready}
            onClick={() => setCartOpen(true)}
            aria-label={`Abrir carrito, ${totalCount} artículos`}
          >
            <ShoppingCart size={24} aria-hidden="true" />
            <span>Mi selección</span>
            <b aria-hidden="true">{totalCount}</b>
          </button>
        </header>
      </div>
      <div className="store-categories">
        <div
          className="category-tabs shell"
          role="group"
          aria-label="Filtrar por categoría"
        >
          {categoryFilters.map(({ id, name }) => {
            const Icon = categoryIcons.get(id) ?? Tag;
            return (
              <button
                key={id}
                className={category === id ? "selected" : ""}
                aria-pressed={category === id}
                disabled={!ready}
                onClick={() => setCategory(id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <main id="contenido" className="shell" inert={!ready} aria-busy={!ready}>
        {!query && category === "todos" && (
          <section className="intro">
            <img
              className="intro-photo"
              src="/catalogo-portada.webp"
              width="1440"
              height="789"
              fetchPriority="high"
              alt=""
            />
            <div className="intro-content">
              <h1>Energía e <span>iluminación</span></h1>
              <p>Paneles solares, tiras LED y lámparas. Arma tu selección y cotiza por WhatsApp.</p>
              <a className="primary intro-link" href="#catalogo">
                Ver productos <ChevronRight size={17} aria-hidden="true" />
              </a>
            </div>
          </section>
        )}
        <section
          id="catalogo"
          className="catalog-section"
          aria-label="Catálogo de productos"
        >
          <div className="catalog-heading">
            <h2 ref={catalogHeading} tabIndex={-1}>
              {categoryTitle ?? "Todos los productos"}
            </h2>
            <span role="status">
              {visible.length}{" "}
              {visible.length === 1 ? "producto" : "productos"}
            </span>
          </div>
          <div className="product-grid">
            {visible.map((product, index) => (
              <article
                className="product-card"
                key={product.id}
                data-selected={cart.some(
                  (item) => item.productId === product.id,
                )}
              >
                <button
                  className="product-image"
                  onClick={() => setDetail(product)}
                  aria-label={`Ver ${product.name}`}
                >
                  {product.imagePath ? (
                    <img
                      src={photo(product)}
                      alt={product.name}
                      loading={index < 3 ? "eager" : "lazy"}
                      width="600"
                      height="460"
                    />
                  ) : (
                    <span className="image-empty">
                      <Lightbulb size={42} />
                      <span>Imagen pendiente</span>
                    </span>
                  )}
                  <span className="image-arrow" aria-hidden="true">
                    <ArrowUpRight size={18} />
                  </span>
                </button>
                <div className="product-content">
                  <p>
                    {
                      categories.find((item) => item.id === product.category)
                        ?.name
                    }
                  </p>
                  <h3>
                    <button
                      className="product-title"
                      onClick={() => setDetail(product)}
                    >
                      {product.name}
                    </button>
                  </h3>
                  <div className="product-bottom">
                    <strong>
                      {formatMoney(product.priceMinor || 0, currency)}
                    </strong>
                    {quantityControl(product)}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-state">
              <Search size={32} />
              <h3>
                {!query && categoryTitle
                  ? "Aún no hay productos en esta categoría"
                  : products.length
                  ? "No encontramos ese producto"
                  : "Estamos preparando el catálogo"}
              </h3>
              <p>
                {products.length
                  ? "Prueba otro nombre o explora todas las categorías."
                  : "Vuelve pronto para descubrir los productos de Villanueva."}
              </p>
              {(products.length > 0 || categoryTitle) && (
                <button
                  className="secondary"
                  onClick={() => {
                    setSearch("");
                    setCategory("todos");
                  }}
                >
                  Ver todos los productos
                </button>
              )}
            </div>
          )}
        </section>
        <section className="help-strip">
          <WhatsAppIcon size={28} />
          <div>
            <h2>Cotiza por WhatsApp</h2>
            <p>
              Agrega los productos que te interesan y pulsa Cotizar. Confirmamos
              disponibilidad y entrega contigo.
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer shell">
        <span>© {new Date().getFullYear()} Villanueva</span>
        <a href="/creditos-fotograficos">Créditos de fotos</a>
        <a href="/admin">
          Administrar catálogo <ArrowUpRight size={14} />
        </a>
      </footer>
      <div className="sr-only" role="status">
        {notice}
      </div>
      {totalCount > 0 && (
        <button className="mobile-cart" onClick={() => setCartOpen(true)}>
          <span>
            <ShoppingCart size={20} />
            <b>{totalCount}</b> Ver selección
          </span>
          <strong>
            {formatMoney(total, currency)} <ChevronRight size={17} />
          </strong>
        </button>
      )}

      <dialog
        ref={cartDialog}
        className="cart-dialog"
        onCancel={() => setCartOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setCartOpen(false);
        }}
        aria-labelledby="cart-title"
      >
        <div className="cart-inner">
          <div className="dialog-heading">
            <div>
              <h2 id="cart-title">Tu selección</h2>
              <p>
                {totalCount} {totalCount === 1 ? "artículo" : "artículos"}
              </p>
            </div>
            <button
              className="icon-button"
              onClick={() => setCartOpen(false)}
              aria-label="Cerrar carrito"
            >
              <X size={22} />
            </button>
          </div>
          {quoteNotice && (
            <p className="feedback cart-notice" role="alert">
              {quoteNotice}
            </p>
          )}
          <div className="cart-lines">
            {cart.map((line) => {
              const product = products.find(
                (item) => item.id === line.productId,
              );
              return (
                <div className="cart-line" key={line.productId}>
                  {product?.imagePath ? (
                    <img src={photo(product)} alt="" width="76" height="76" />
                  ) : (
                    <span className="cart-line-placeholder" aria-hidden="true">
                      <Lightbulb size={24} />
                    </span>
                  )}
                  <div className="cart-line-info">
                    <h3>{product?.name || "Producto no disponible"}</h3>
                    <p>
                      {formatMoney(
                        (product?.priceMinor || 0) * line.quantity,
                        currency,
                      )}
                    </p>
                    {product?.available ? (
                      quantityControl(product)
                    ) : (
                      <button
                        className="text-link"
                        onClick={() =>
                          setCart((current) =>
                            current.filter(
                              (item) => item.productId !== line.productId,
                            ),
                          )
                        }
                      >
                        Quitar de la selección
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!cart.length && (
              <div className="empty-state">
                <ShoppingCart size={38} />
                <h3>Aún no has elegido productos</h3>
                <p>Explora el catálogo y agrega los que te interesan.</p>
                <button
                  className="secondary"
                  onClick={() => setCartOpen(false)}
                >
                  Explorar productos
                </button>
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <div className="cart-summary">
              <div className="subtotal">
                <span>Subtotal</span>
                <strong>{formatMoney(total, currency)}</strong>
              </div>
              <p>
                Entrega a coordinar. Confirmaremos la disponibilidad por
                WhatsApp.
              </p>
              {longMessage && (
                <div className="long-message">
                  <p>
                    Tu selección es extensa. Copia el resumen y pégalo en
                    WhatsApp.
                  </p>
                  <textarea
                    aria-label="Resumen para copiar"
                    readOnly
                    value={longMessage}
                  />
                  <button
                    className="secondary"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(longMessage)
                        .then(() =>
                          setQuoteNotice("Resumen copiado. Pégalo en el chat."),
                        )
                        .catch(() =>
                          setQuoteNotice(
                            "Selecciona el resumen y cópialo manualmente.",
                          ),
                        )
                    }
                  >
                    Copiar resumen
                  </button>
                </div>
              )}
              {longMessage ? (
                <a
                  className="primary quote-button"
                  href="https://wa.me/5359159122"
                >
                  <WhatsAppIcon /> Cotizar <ArrowUpRight size={18} />
                </a>
              ) : (
                <button
                  className="primary quote-button"
                  onClick={quote}
                  disabled={busy}
                >
                  <WhatsAppIcon />
                  {busy ? "Preparando…" : "Cotizar"}
                  <ArrowUpRight size={18} />
                </button>
              )}
              <small>Revisa el mensaje y envíalo en WhatsApp.</small>
            </div>
          )}
        </div>
      </dialog>
      <dialog
        ref={detailDialog}
        className="detail-dialog"
        onCancel={() => setDetail(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDetail(null);
        }}
        aria-labelledby="detail-title"
      >
        {detail && (
          <div
            className={detail.imagePath ? "detail-inner" : "detail-inner detail-no-photo"}
          >
            <button
              className="icon-button detail-close"
              onClick={() => setDetail(null)}
              aria-label="Cerrar ficha"
            >
              <X size={22} />
            </button>
            {detail.imagePath && (
              <img
                className="detail-photo"
                src={photo(detail)}
                alt={detail.name}
              />
            )}
            <div className="detail-content">
              <h2 id="detail-title">{detail.name}</h2>
              <strong className="detail-price">
                {formatMoney(detail.priceMinor || 0, currency)}
              </strong>
              {detail.description && <p>{detail.description}</p>}
              {detail.specifications.length > 0 && (
                <dl>
                  {detail.specifications.map((item, index) => (
                    <div key={index}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="detail-actions">
                {quantityControl(detail)}
                <button
                  className="text-link detail-selection"
                  onClick={() => {
                    setDetail(null);
                    setCartOpen(true);
                  }}
                >
                  Ver mi selección <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
