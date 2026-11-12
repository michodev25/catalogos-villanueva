import type { APIRoute } from "astro";
import { z } from "zod";
import { createQuote } from "../../lib/catalog";
import { getCatalog } from "../../lib/server/products";
const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50)
    .refine(
      (items) =>
        new Set(items.map((item) => item.productId)).size === items.length,
    ),
  displayedPrices: z.record(
    z.string().max(100),
    z.number().int().min(0).max(1_000_000_000).nullable(),
  ),
  displayedCurrency: z.string().max(5),
});
export const POST: APIRoute = async (context) => {
  try {
    const text = await context.request.text();
    if (text.length > 30000)
      return Response.json(
        { error: "La selección es demasiado extensa." },
        { status: 400 },
      );
    const input = schema.parse(JSON.parse(text));
    const { products, currency } = await getCatalog(context);
    const result = createQuote(
      input.items,
      input.displayedPrices as Record<string, number>,
      input.displayedCurrency,
      products,
      currency,
    );
    return Response.json(
      { ...result, products },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "No se pudo preparar la cotización. Revisa tu selección y vuelve a intentarlo.",
      },
      { status: 400 },
    );
  }
};
