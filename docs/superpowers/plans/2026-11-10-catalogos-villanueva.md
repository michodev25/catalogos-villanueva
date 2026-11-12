# Catálogos Villanueva Implementation Plan

> **For agentic workers** REQUIRED SUB-SKILL — Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal**

Entregar un catálogo responsive administrable por su propietario, con precios visibles, carrito persistente y solicitudes por WhatsApp al +53 59159122.

**Architecture**

Astro sirve las páginas y las operaciones del servidor mediante el adaptador Node en modo standalone. React gestiona el catálogo interactivo, el detalle y el carrito. PostgreSQL, Storage y Auth de Supabase aportan persistencia, fotos y acceso privado.

**Tech Stack**

Astro, React, TypeScript estricto, CSS, Supabase JS y SSR, Sharp para imágenes. Vitest para las reglas del carrito y las solicitudes, Playwright para los flujos principales. Fijar las versiones compatibles mediante package-lock.json al instalar.

**Spec**

`docs/superpowers/specs/2026-11-10-catalogos-villanueva-design.md`. Contexto de producto en `PRODUCT.md`. Diseño funcional aprobado por el mensaje «comineza». La dirección visual se resolverá aplicando Impeccable durante la primera tarea.

## Restricciones generales

- Tres categorías iniciales, Paneles, Tiras LED RGB y Lámparas solares.
- Todos los productos publicados tienen precio visible, incluidos los agotados.
- La primera versión usa una moneda configurable para todo el catálogo.
- El usuario visible es `admin`. El registro público está deshabilitado.
- El selector conserva el orden **[ + ] 1 [ − ]** solicitado por el propietario.
- Las acciones del carrito son **Cotizar**, con el icono de WhatsApp.
- El destino de WhatsApp es `https://wa.me/5359159122`. El cliente envía el mensaje desde WhatsApp.
- La contraseña compartida pertenece a las pruebas locales. Las credenciales se configuran fuera del código y de la documentación.
- Una foto principal y una ficha por presentación. El historial de pedidos se gestiona en WhatsApp en esta versión.

## Condiciones que requieren especial revisión

1. Un precio cambia o un producto se oculta mientras permanece en el carrito. Recalcular y pedir al cliente revisar la selección antes de abrir WhatsApp. Tarea 4.
2. Un visitante llama directamente a la API o a Supabase. Las políticas deben impedir escrituras y lecturas de borradores. Tarea 2.
3. El almacenamiento del navegador está corrupto, bloqueado o contiene cantidades inválidas. Recuperar un carrito válido y permitir seguir comprando. Tarea 3.
4. Una foto falla al subir o dos pestañas guardan el mismo producto. Conservar la imagen vigente y evitar que una edición antigua sobrescriba otra. Tarea 5.
5. Un nombre largo, el teclado móvil o un texto ampliado ocupan más espacio. Mantener visibles el precio y los controles sin desbordamiento horizontal. Tarea 6.

## Archivos y responsabilidades

| Ubicación | Responsabilidad |
| --- | --- |
| `astro.config.mjs`, `package.json`, `tsconfig.json`, `.gitignore`, `.env.example` | Ejecución SSR, dependencias y variables documentadas sin secretos |
| `src/layouts/Layout.astro`, `src/styles/global.css` | Documento, estilos compartidos, foco visible y adaptación de tamaños |
| `src/pages/index.astro`, `src/pages/productos/[id].astro` | Catálogo y enlace directo a cada producto publicado |
| `src/components/catalog/Catalog.tsx`, `ProductCard.tsx`, `ProductDetail.tsx`, `Cart.tsx` | Búsqueda, categorías, cantidades, ficha y resumen |
| `src/lib/catalog.ts`, `money.ts`, `cart.ts`, `quote.ts` | Tipos y reglas compartidas de productos, importes, selección y resumen |
| `src/lib/server/supabase.ts`, `auth.ts`, `products.ts`, `images.ts` | Clientes por solicitud, identidad administrativa, persistencia y fotos |
| `src/pages/api/quote.ts` | Validación del carrito con los datos actuales |
| `src/pages/admin/login.astro`, `index.astro`, `productos/[id].astro` | Acceso, listado y editor administrativo |
| `src/components/admin/ProductForm.tsx` | Edición, validación visible y previsualización de imagen |
| `src/pages/api/admin/login.ts`, `logout.ts`, `products.ts`, `settings.ts` | Operaciones autenticadas |
| `src/pages/media/[id].webp.ts` | Entrega de la foto visible para la sesión actual |
| `supabase/migrations/202611100001_catalog.sql` | Esquema, permisos y datos iniciales de categorías |
| `supabase/tests/catalog_access.sql` | Pruebas de acceso público, administrador y otra cuenta |
| `tests/unit/cart.test.ts`, `quote.test.ts`, `money.test.ts` | Persistencia dañada, cantidades, precios y cambios del catálogo |
| `tests/e2e/catalog.spec.ts`, `admin.spec.ts`, `playwright.config.ts` | Navegación, cantidades, edición y permisos en navegador |
| `README.md`, `DESIGN.md`, `.impeccable/surfaces/` | Instalación y decisiones visuales verificables |

## Tarea 1 — Base ejecutable y estructura de pantallas

**Interfaz de salida**

`Product` contiene `id`, `categoryId`, `name`, `description`, `specifications`, `priceMinor`, `imagePath`, `published`, `available` y `updatedAt`. `specifications` es una lista de `{ label, value }`. Los borradores permiten nombre vacío, precio nulo y foto nula. `PublishedProduct` exige nombre, precio y foto válidos. `StoreSettings` contiene `currency` y `whatsappNumber`.

- [ ] Preparar la dirección visual con Impeccable usando el contexto ya confirmado. El catálogo y el panel se tratan como pantallas para completar tareas. Presentar la composición inicial antes de fijar una identidad visual que el propietario aún no ha elegido.
- [ ] Crear la configuración de Astro con React, TypeScript estricto y adaptador Node standalone. Añadir scripts `dev`, `check`, `build`, `test` y `test:e2e`.
- [ ] Crear las rutas y el layout. La primera pantalla da acceso directo a los productos, el buscador y las categorías. Incorporar la ficha como diálogo accesible y mantener enlaces directos a los productos.
- [ ] Definir los tipos en `src/lib/catalog.ts` y `formatMoney(priceMinor: number, currency: string): string` en `money.ts`. Usar enteros en centavos y validar enteros seguros. Proponer CUP como moneda de demostración y dejarla configurable antes de publicar.
- [ ] Crear `.env.example` con `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAIL`, `ADMIN_USER_ID` y `APP_ORIGIN`, todos sin valores privados. Ignorar `.env` y dependencias, preservando el ejemplo.
- [ ] Ejecutar `npm run check` y `npm run build`. Resultado esperado, tipos correctos y generación del servidor Node. Si falta configuración externa, mostrar un estado explícito de instalación pendiente.

## Tarea 2 — Base de datos y acceso exclusivo del propietario

**Interfaz de salida**

`createServerClient(context: APIContext): SupabaseClient`, `requireAdmin(context: APIContext): Promise<User>`, `listPublishedProducts(client: SupabaseClient): Promise<PublishedProduct[]>` y `getStoreSettings(client: SupabaseClient): Promise<StoreSettings>`.

- [ ] Crear las tablas `categories`, `products`, `store_settings` y una asignación privada singleton del identificador del administrador. `products.price_minor` usa enteros con límite superior de 1000000000. La publicación exige nombre, foto, categoría y precio mayor que cero. Guardar las especificaciones como JSON validado y `updated_at` como versión de edición.
- [ ] Insertar las tres categorías. Proteger productos y configuración con RLS. El público consulta productos publicados, categorías y configuración pública. Solo el UUID del propietario puede modificar datos. Otra cuenta autenticada recibe los mismos permisos limitados que un visitante.
- [ ] Crear un bucket privado de imágenes con políticas que permiten lectura pública solamente cuando el archivo pertenece a un producto publicado y escritura exclusiva del propietario. Servir la foto por la ruta de medios, comprobando la visibilidad del producto mediante la sesión correspondiente. Las respuestas administrativas y los borradores usan `Cache-Control: no-store`.
- [ ] Implementar inicio de sesión en el servidor. Traducir `admin` a `ADMIN_EMAIL`, autenticar con Supabase y comprobar que la identidad coincide con `ADMIN_USER_ID` y la asignación privada. Mantener los tokens en cookies de sesión y comprobar la identidad con el proveedor, también en las APIs.
- [ ] Configurar registro público deshabilitado y aprovisionar el propietario de forma privada. Añadir cierre de sesión, comprobación de origen para mutaciones y límite de intentos por IP. En el servidor Node inicial de una instancia, usar cinco intentos por quince minutos junto con los límites del proveedor. Documentar la configuración del proxy y ampliar el limitador si el despliegue usa varias instancias.
- [ ] Ejecutar `npx supabase test db` sobre la instancia local y `npm run test:e2e -- admin.spec.ts` para el acceso. Deben rechazar edición anónima, lectura de borradores, otro usuario autenticado y contraseña incorrecta. Tras cerrar sesión, una edición directa debe fallar.

La conexión requiere un proyecto de Supabase o una instancia local con sus servicios funcionando. Registrar los pasos externos pendientes si esas credenciales aún no se han configurado. La cuenta y las pruebas se realizan en un entorno de desarrollo aislado.

## Tarea 3 — Catálogo y carrito persistente

**Interfaces**

Consume `PublishedProduct` y `StoreSettings`. Produce `CartItem = { productId: string, quantity: number }`, `readCart(raw: string | null): CartItem[]` y `setQuantity(items: CartItem[], productId: string, quantity: number): CartItem[]`.

- [ ] Escribir y ejecutar pruebas para JSON inválido, identificadores repetidos, cantidades negativas, decimales y valores excesivos. Comprobar que reducir de uno a cero elimina la línea y que sumar conserva las demás líneas. Límites iniciales, 99 unidades por producto y 50 productos distintos, con mensaje visible al alcanzar el límite.

```ts
it('recupera un carrito vacío ante JSON dañado', () => {
  expect(readCart('{')).toEqual([]);
});
it('quita el producto al reducir a cero', () => {
  const items = [{ productId: 'tira-5m', quantity: 1 }];
  expect(setQuantity(items, 'tira-5m', 0)).toEqual([]);
});
```

- [ ] Implementar las reglas en `src/lib/cart.ts` y la persistencia versionada `villanueva.cart.v1`. Leer el almacenamiento después de hidratar React y guardar solo identificadores y cantidades. Si el navegador impide persistir, mantener el carrito en memoria y avisar de que se perderá al cerrar.
- [ ] Crear un estado React compartido dentro de cada pantalla de catálogo o detalle. Unificar el control de cantidad entre tarjetas y carrito. Al navegar a otra ficha, recuperar el mismo carrito persistido.
- [ ] Implementar búsqueda por nombre ignorando mayúsculas y acentos, filtro por categoría y estado sin resultados con acción para limpiar filtros. Mostrar agotados con precio visible y sin opción de agregar.
- [ ] Montar carrito móvil como diálogo de pantalla completa y escritorio como panel lateral. Restaurar el foco al cerrar, cerrar con Escape y anunciar cambios de cantidad sin interrumpir la navegación.
- [ ] Ejecutar `npm run test -- cart` y el flujo de navegador que agrega, ajusta, quita y recarga. Las cantidades y el subtotal deben coincidir en todas las vistas.

## Tarea 4 — Preparar la solicitud para WhatsApp

**Interfaces**

`POST /api/quote` recibe `{ items: CartItem[], displayedPrices: Record<string, number>, displayedCurrency: string }`. Devuelve `{ items: QuotedItem[], subtotalMinor: number, currency: string, changes: QuoteChange[], whatsappUrl: string | null }`. Los precios enviados solo sirven para detectar cambios, el total se calcula siempre con los valores del servidor.

`QuotedItem` contiene `productId`, `name`, `quantity`, `unitPriceMinor` y `lineTotalMinor`. `QuoteChange` contiene `productId` opcional y `reason`, con valores `price`, `unavailable`, `removed` o `currency`. `createQuote(items: CartItem[], displayedPrices: Record<string, number>, displayedCurrency: string, products: PublishedProduct[], settings: StoreSettings): QuoteResult` mantiene la lógica independiente de la consulta de datos.

- [ ] Escribir pruebas para precio cambiado, artículo oculto, agotado, carrito vacío, moneda cambiada y subtotal decimal exacto. Por ejemplo, dos unidades a 1999 centavos suman 3998 centavos. El resultado con cambios tiene `whatsappUrl` nulo.
- [ ] Implementar `createQuote` en `src/lib/quote.ts` y el endpoint con consulta fresca. Validar el límite de líneas y cantidades. Incluir cambios comprensibles y reemplazar en pantalla los datos anteriores. El cliente debe revisar y pulsar de nuevo después de un cambio.
- [ ] Generar el mensaje en español con nombre, cantidad, precio unitario, importe por línea, subtotal, moneda y «Entrega a coordinar». Codificar el texto para el destino `5359159122`. Mantener el mensaje conciso y ofrecer copiar el resumen cuando sea demasiado largo para un enlace práctico.
- [ ] Conectar **Cotizar** con la validación y la navegación al enlace. Evitar abrir una ventana tardía que el navegador pueda bloquear. Mostrar error recuperable si la consulta falla y conservar el carrito.
- [ ] Ejecutar `npm run test -- quote` y el flujo de navegador interceptando la navegación externa. Comprobar número, texto y conservación del carrito sin enviar mensajes reales.

## Tarea 5 — Panel de productos y fotografías

**Interfaces**

`POST /api/admin/products` recibe `FormData` con `id`, `expectedUpdatedAt`, datos de producto y foto opcional. Crear con UUID estable por formulario. La respuesta devuelve el producto guardado o errores por campo. Actualizar solo si coincide la versión enviada. `POST /api/admin/settings` actualiza la moneda validada.

- [ ] Crear listado administrativo con estados de publicación y disponibilidad. El botón **Nuevo producto** abre un borrador con categoría seleccionable. El mismo formulario permite editar descripción y pares de especificaciones. La moneda se configura para toda la tienda y su cambio requiere confirmar que afecta a los importes existentes, sin conversión automática.
- [ ] Implementar validación compartida de datos y errores junto al campo correspondiente. El guardado en borrador admite información parcial. **Publicar** exige los campos del diseño. Validar el precio introducido con coma o punto y un máximo de dos decimales, sin errores de coma flotante.
- [ ] Previsualizar la foto en el teléfono y liberar las URLs temporales al reemplazarla. Admitir JPEG, PNG y WebP hasta 8 MB. Verificar contenido real con Sharp y limitar dimensiones decodificadas a 24 megapíxeles. Corregir orientación, quitar metadatos y generar WebP de hasta 1200 px.
- [ ] Subir cada reemplazo con un nombre único. Actualizar la referencia del producto solo después de completar la subida y validar la versión de edición. Si falla, conservar la foto actual. Limpiar el archivo nuevo sin referencia cuando sea posible y eliminar una foto anterior solo después de confirmar que ya no está referenciada.
- [ ] Deshabilitar el guardado mientras está en curso y devolver el producto por su UUID tras un reintento de creación, evitando duplicados. Devolver conflicto cuando otra pestaña haya cambiado la versión, conservando el formulario para revisar.
- [ ] Ejecutar pruebas de navegador de creación, edición, publicación, agotado y borrador. Inyectar fallo de subida y conflicto entre dos pestañas para confirmar que la foto y la edición anteriores sobreviven.

## Tarea 6 — Revisión visual, funcionamiento y entrega

- [ ] Aplicar la revisión final de Impeccable al catálogo, ficha, carrito, login y editor. Leer su guía de calidad antes de editar UI y revisar el resultado renderizado. Guardar las decisiones visuales en los archivos que prescribe la habilidad.
- [ ] Revisar anchos de 360, 390, 768 y 1440 px, además de zoom al 200 %. Usar nombres largos y descripciones vacías. Verificar controles táctiles de al menos 44 px, foco visible, contraste legible, etiquetas de formularios y espacio para la barra inferior y el teclado.
- [ ] Revisar estados vacío, agotado, carga, fallo de red y sesión caducada. Si el guardado falla por sesión caducada, conservar los datos escritos y permitir recuperar el acceso.
- [ ] Ejecutar una vez `npm run check`, `npm run test`, `npm run test:e2e` y `npm run build` sobre el resultado final. Las pruebas que dependan de Supabase deben usar la instancia de desarrollo configurada y registrar por separado cualquier verificación pendiente.
- [ ] Completar README con instalación, variables, migración, creación de la cuenta, cambio de contraseña, moneda y arranque del servidor. Incluir pasos de copia de seguridad y restauración de datos y fotos según el proveedor finalmente elegido.
- [ ] Entregar la vista local y el resultado de las pruebas. Validar apertura de WhatsApp en dispositivos reales y acceso desde la conexión del negocio antes de publicar. El alojamiento definitivo, dominio y configuración de producción se concretan con esos datos.

## Referencias técnicas consultadas

- [Astro y React](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Adaptador Node de Astro](https://docs.astro.build/en/guides/integrations-guide/node/)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Acceso con contraseña](https://supabase.com/docs/guides/auth/passwords)
- [Permisos de Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Enlaces a WhatsApp con mensaje](https://faq.whatsapp.com/5913398998672934/)

## Estado de entrega del plan

Plan redactado y contrastado con el diseño funcional. Las tareas están pendientes de ejecución. La carpeta todavía carece de repositorio Git. Las credenciales de Supabase, los activos comerciales, la moneda final y el alojamiento quedan por configurar. Las verificaciones anteriores son criterios de aceptación, aún pendientes de ejecutarse.

Impeccable se aplicó mediante lectura de su habilidad y sus guías de planificación. El cargador de contexto intentó descargar su motor, pero la preparación no terminó y se canceló. Se usaron directamente el diseño y PRODUCT.md. La revisión de una interfaz renderizada corresponde a la fase de implementación.

## Resultado de la ejecución del 11 de noviembre de 2026

Implementadas las pantallas, el acceso local privado, la edición de productos, la subida de fotos y la acción única Cotizar con icono de WhatsApp. El chequeo de tipos y la compilación pasan. Se aprobaron siete pruebas de reglas y doce pruebas de navegador.

Se añadió SQLite para la demostración local, con contraseña almacenada como hash y sesiones de servidor, mientras se configura Supabase. Las rutas de Supabase, su migración y las pruebas SQL están preparadas. La ejecución contra un proyecto real, las pruebas SQL de permisos, la publicación y la validación de WhatsApp desde dispositivos físicos quedan pendientes de esa configuración.

La identidad verde y marfil, las imágenes ilustrativas y CUP son decisiones provisionales del implementador. El catálogo de demostración informa de sus datos de ejemplo.

La revisión de código encontró siete casos que se corrigieron. Las pruebas reprodujeron y verificaron los cambios de selección durante una cotización, la explicación de artículos retirados, la edición durante un guardado, los identificadores vacíos y los textos largos. También se corrigieron el formato de la versión persistida y la conservación de fotos ante una respuesta de guardado incierta en Supabase. Esas dos correcciones requieren además la prueba de integración con el proveedor.

La revisión visual independiente examinó seis capturas de catálogo, carrito, acceso y panel. Su resultado fue ship para la demostración local. El alcance de esa revisión es visual y no acredita un despliegue de producción.
