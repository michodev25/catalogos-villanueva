import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defaultCategories, type Product } from "../catalog";

let database: DatabaseSync;
export function localDb() {
  if (database) return database;
  mkdirSync(resolve(".local/images"), { recursive: true });
  database = new DatabaseSync(resolve(".local/catalog.sqlite"));
  database.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), currency TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY);
    INSERT OR IGNORE INTO settings VALUES(1, 'USD');
    CREATE TRIGGER IF NOT EXISTS product_category_insert BEFORE INSERT ON products
    WHEN NOT EXISTS (SELECT 1 FROM categories WHERE id = json_extract(NEW.data, '$.category'))
    BEGIN SELECT RAISE(ABORT, 'Selecciona una categoría válida.'); END;
    CREATE TRIGGER IF NOT EXISTS product_category_update BEFORE UPDATE OF data ON products
    WHEN NOT EXISTS (SELECT 1 FROM categories WHERE id = json_extract(NEW.data, '$.category'))
    BEGIN SELECT RAISE(ABORT, 'Selecciona una categoría válida.'); END;`);

  database.exec("BEGIN IMMEDIATE");
  try {
    if (!database.prepare("SELECT id FROM metadata WHERE id=2").get()) {
      const seedCategory = database.prepare("INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)");
      for (const { id, name } of defaultCategories) seedCategory.run(id, name);
      database.prepare("INSERT INTO metadata VALUES(2)").run();
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  if (!database.prepare("SELECT id FROM metadata WHERE id=1").get()) {
    const examples: Product[] = [
      {
        id: "demo-panel",
        name: "Panel solar monocristalino",
        category: "paneles",
        description:
          "Producto de ejemplo para explorar el catálogo. Sustituye la fotografía, las especificaciones y el precio por los de tu producto real desde el panel.",
        specifications: [{ label: "Contenido", value: "Demostración" }],
        priceMinor: 2500000,
        imagePath: "demo/solar.jpg",
        published: true,
        available: true,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "demo-led",
        name: "Tira LED RGB con control",
        category: "led",
        description:
          "Ambiente ilustrativo. Personaliza el nombre, el contenido y el precio de esta ficha desde tu panel privado.",
        specifications: [{ label: "Contenido", value: "Demostración" }],
        priceMinor: 350000,
        imagePath: "demo/led.jpg",
        published: true,
        available: true,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "demo-lamp",
        name: "Lámpara solar de exterior",
        category: "lamparas",
        description:
          "Fotografía ilustrativa de iluminación. Reemplázala por una foto de tu lámpara solar antes de compartir tu catálogo.",
        specifications: [{ label: "Contenido", value: "Demostración" }],
        priceMinor: 680000,
        imagePath: "demo/lamp.jpg",
        published: true,
        available: true,
        updatedAt: new Date().toISOString(),
      },
    ];
    const insert = database.prepare("INSERT INTO products VALUES(?, ?)");
    for (const product of examples)
      insert.run(product.id, JSON.stringify(product));
    database.prepare("INSERT INTO metadata VALUES(1)").run();
  }
  return database;
}
