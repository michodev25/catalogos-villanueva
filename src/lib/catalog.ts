export interface Category {
  id: string;
  name: string;
}

export const defaultCategories: Category[] = [
  { id: "paneles", name: "Paneles" },
  { id: "led", name: "Tiras LED RGB" },
  { id: "lamparas", name: "Lámparas solares" },
];

export function sortCategories(categories: Category[]): Category[] {
  const defaults = defaultCategories.flatMap(({ id }) =>
    categories.filter((category) => category.id === id),
  );
  const custom = categories.filter(({ id }) =>
    !defaultCategories.some((category) => category.id === id),
  );
  return [...defaults, ...custom.sort((a, b) => a.name.localeCompare(b.name, "es"))];
}
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  specifications: { label: string; value: string }[];
  priceMinor: number | null;
  imagePath: string | null;
  published: boolean;
  available: boolean;
  updatedAt: string;
}
export interface CartItem {
  productId: string;
  quantity: number;
}
export interface QuoteItem extends CartItem {
  name: string;
  unitPriceMinor: number;
  lineTotalMinor: number;
}
export interface Quote {
  items: QuoteItem[];
  subtotalMinor: number;
  currency: string;
  changes: string[];
  whatsappUrl: string | null;
  message: string;
}
export const formatMoney = (amount: number, currency: string) =>
  `${new Intl.NumberFormat("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)} ${currency}`;

export function parsePrice(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized))
    throw new Error("Escribe un precio válido con hasta dos decimales.");
  const [whole, fraction = ""] = normalized.split(".");
  const price = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (price > 1_000_000_000)
    throw new Error("El precio supera el máximo permitido.");
  return price;
}

export function readCart(raw: string | null): CartItem[] {
  try {
    const value = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    const unique = new Map<string, CartItem>();
    for (const item of value.slice(0, 50)) {
      if (
        item &&
        typeof item.productId === "string" &&
        item.productId.length > 0 &&
        item.productId.length <= 100 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 99 &&
        !unique.has(item.productId)
      )
        unique.set(item.productId, {
          productId: item.productId,
          quantity: item.quantity,
        });
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

export function setQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
): CartItem[] {
  const next = items.filter((item) => item.productId !== productId);
  if (Number.isInteger(quantity) && quantity > 0 && next.length < 50)
    next.push({ productId, quantity: Math.min(quantity, 99) });
  return next;
}

export function createQuote(
  cart: CartItem[],
  prices: Record<string, number>,
  displayedCurrency: string,
  products: Product[],
  currency: string,
): Quote {
  const changes: string[] = [];
  const items: QuoteItem[] = [];
  if (displayedCurrency !== currency)
    changes.push(`La moneda del catálogo cambió a ${currency}.`);
  for (const line of cart) {
    const product = products.find(
      (item) => item.id === line.productId && item.published,
    );
    if (!product || !product.available || product.priceMinor === null) {
      changes.push(
        product
          ? `${product.name} está agotado.`
          : "Un producto ya no está disponible.",
      );
      continue;
    }
    if (prices[product.id] !== product.priceMinor)
      changes.push(`Cambió el precio de ${product.name}.`);
    items.push({
      ...line,
      name: product.name,
      unitPriceMinor: product.priceMinor,
      lineTotalMinor: product.priceMinor * line.quantity,
    });
  }
  const subtotalMinor = items.reduce(
    (sum, item) => sum + item.lineTotalMinor,
    0,
  );
  const message = [
    "Hola, quiero cotizar estos productos de Villanueva.",
    "",
    ...items.map(
      (item) =>
        `${item.quantity} × ${item.name}\n${formatMoney(item.unitPriceMinor, currency)} c/u · ${formatMoney(item.lineTotalMinor, currency)}`,
    ),
    "",
    `Subtotal: ${formatMoney(subtotalMinor, currency)}`,
    "Entrega a coordinar. ¿Me confirmas disponibilidad?",
  ].join("\n");
  return {
    items,
    subtotalMinor,
    currency,
    changes,
    message,
    whatsappUrl:
      items.length && !changes.length
        ? `https://wa.me/5359159122?text=${encodeURIComponent(message)}`
        : null,
  };
}
