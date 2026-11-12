import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  readCart,
  setQuantity,
  parsePrice,
  createQuote,
} from "../../src/lib/catalog.ts";

describe("reglas del catálogo", () => {
  it("descarta identificadores vacíos y conserva los productos válidos", () => {
    assert.deepEqual(
      readCart(
        '[{"productId":"","quantity":1},{"productId":"a","quantity":2}]',
      ),
      [{ productId: "a", quantity: 2 }],
    );
  });
  it("recupera almacenamiento dañado y descarta cantidades inválidas", () => {
    assert.deepEqual(readCart("{"), []);
    assert.deepEqual(readCart("{}"), []);
    assert.deepEqual(
      readCart(
        '[{"productId":"a","quantity":-1},{"productId":"b","quantity":1.2}]',
      ),
      [],
    );
    assert.deepEqual(
      readCart(
        '[{"productId":"a","quantity":2},{"productId":"a","quantity":3}]',
      ),
      [{ productId: "a", quantity: 2 }],
    );
  });
  it("elimina al bajar a cero y limita a 99 unidades", () => {
    assert.deepEqual(
      setQuantity([{ productId: "a", quantity: 1 }], "a", 0),
      [],
    );
    assert.deepEqual(setQuantity([], "a", 120), [
      { productId: "a", quantity: 99 },
    ]);
  });
  it("interpreta importes con coma o punto y rechaza precisión excesiva", () => {
    assert.equal(parsePrice("19,99"), 1999);
    assert.equal(parsePrice("0.10"), 10);
    assert.throws(() => parsePrice("1.999"));
    assert.throws(() => parsePrice("-2"));
  });
});
const product = {
  id: "a",
  name: "Tira RGB",
  category: "led",
  description: "",
  specifications: [],
  priceMinor: 1999,
  imagePath: null,
  published: true,
  available: true,
  updatedAt: "v1",
};
describe("cotización", () => {
  it("recalcula importes y enlaza al teléfono de Villanueva", () => {
    const quote = createQuote(
      [{ productId: "a", quantity: 2 }],
      { a: 1999 },
      "CUP",
      [product],
      "CUP",
    );
    assert.equal(quote.subtotalMinor, 3998);
    assert.match(quote.whatsappUrl!, /^https:\/\/wa.me\/5359159122\?text=/);
    assert.match(decodeURIComponent(quote.whatsappUrl!), /cotizar/);
  });
  it("exige revisión si el precio cambió", () => {
    const quote = createQuote(
      [{ productId: "a", quantity: 2 }],
      { a: 1 },
      "CUP",
      [product],
      "CUP",
    );
    assert.equal(quote.whatsappUrl, null);
    assert.equal(quote.subtotalMinor, 3998);
    assert.ok(quote.changes.includes("Cambió el precio de Tira RGB."));
  });
  it("excluye agotados, ocultos y detecta cambio de moneda", () => {
    const quote = createQuote(
      [{ productId: "a", quantity: 2 }],
      { a: 1999 },
      "USD",
      [{ ...product, available: false }],
      "CUP",
    );
    assert.deepEqual(quote.items, []);
    assert.equal(quote.whatsappUrl, null);
    assert.ok(quote.changes.length > 0);
    assert.deepEqual(
      createQuote(
        [{ productId: "a", quantity: 1 }],
        { a: 1999 },
        "CUP",
        [{ ...product, published: false }],
        "CUP",
      ).items,
      [],
    );
  });
});
