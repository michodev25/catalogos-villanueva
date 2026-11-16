# Catálogos Villanueva

Catálogo responsive con Astro, React y TypeScript. El propietario mantiene sus productos desde un panel privado. El cliente elige cantidades y pulsa **Cotizar**, con el icono de WhatsApp, para preparar un mensaje dirigido a **+53 59159122**.

## Probar en esta computadora

Requiere Node.js 22.23.4 o posterior compatible con la versión de Astro instalada. Este proyecto se comprobó con Node 26.13.

```powershell
npm install
npm run setup:local
npm run dev
```

El catálogo abre en `http://127.0.0.1:4321` y el panel en `http://127.0.0.1:4321/admin`. El usuario es `admin`. El comando de preparación solicita la contraseña y guarda su hash en el archivo privado `.env`. En esta instalación ya se configuró la contraseña local indicada por el propietario.

El modo local utiliza SQLite y fotografías en `.local/`. Los cambios sobreviven a los reinicios. Se limita al servidor de desarrollo en localhost. El archivo `.env` y la carpeta `.local/` están excluidos de Git. Para cambiar la contraseña, ejecutar de nuevo `npm run setup:local` y reiniciar el servidor. Esto también cierra las sesiones locales anteriores.

Las fichas iniciales, los precios y las imágenes son ejemplos señalizados. Cada ficha admite reemplazar la imagen y todos sus datos desde el panel. La moneda inicial es USD, configurable en **Configuración**. Cambiar la moneda conserva los importes existentes; los precios se editan desde cada producto.

## Funciones

- Categorías, búsqueda, detalle de productos y precios visibles.
- El propietario crea categorías en **Panel → Categorías** y las asigna desde el editor de productos. Todas las categorías aparecen en la tienda.
- El propietario puede eliminar productos desde su ficha y eliminar categorías vacías desde **Panel → Categorías**.
- Agregar y ajustar cantidades con **+ 1 −**. Persistencia del carrito en el navegador.
- Acción única **Cotizar**. El servidor comprueba de nuevo precios y disponibilidad antes de generar el mensaje. El cliente pulsa Enviar dentro de WhatsApp.
- Panel con cuenta única, campos editables, características, foto, disponibilidad y borradores.
- Hasta tres imágenes JPG, PNG o WebP de 8 MB cada una. La primera es la portada y las demás se ven en la ficha. El servidor comprueba el formato, limita dimensiones, elimina metadatos y convierte a WebP.
- Guardado con control de versión. Una edición antigua avisa del conflicto con otra pestaña.

## Conectar Supabase

1. Crear un proyecto de desarrollo y ejecutar las migraciones de `supabase/migrations/` en orden. La primera crea el catálogo y el bucket privado `products`. Las siguientes habilitan la creación y eliminación de categorías para el propietario. En un proyecto existente, aplicar solo las migraciones pendientes.
2. Deshabilitar nuevas inscripciones en la configuración de Auth. Crear una cuenta privada con correo y una contraseña única para producción.
3. Registrar su UUID mediante `insert into private.store_admin (id, user_id) values (1, 'UUID_DE_LA_CUENTA');` desde el editor SQL con permisos administrativos.
4. Configurar en el entorno del servidor `DATA_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAIL`, `ADMIN_USER_ID` y `APP_ORIGIN`. Este último debe coincidir con el origen HTTPS público, sin barra final.
5. Comprobar el acceso de `admin`, subir un producto, verificar sus permisos y probar el catálogo desde la conexión real del negocio. El correo privado se resuelve en el servidor a partir del alias `admin`.

El servidor usa la sesión de Supabase y sus políticas RLS. El UUID del propietario es la única identidad con permiso de escritura. Los visitantes solo pueden consultar productos publicados y las imágenes asociadas. Las cuentas de otras personas carecen de permiso administrativo aunque consigan autenticarse.

La integración está preparada. Las pruebas contra un proyecto real requieren configurar sus credenciales. Los datos locales de demostración permanecen separados del catálogo de Supabase.

## Guardar fotos nuevas en Cloudinary

1. Aplica las migraciones de Supabase pendientes, incluida `202611160001_product_photos.sql`.
2. En **Cloudinary → Settings → API Keys**, copia la URL de conexión con formato `cloudinary://<api_key>:<api_secret>@<cloud_name>`.
3. En **Vercel → Settings → Environment Variables**, guarda esa URL como `CLOUDINARY_URL` para **Production**. Después, vuelve a desplegar.
4. Sube una foto de prueba desde el panel y comprueba que aparece en la ficha pública y como recurso autenticado en Cloudinary.

Las fotos nuevas en producción se guardan en Cloudinary y sus miniaturas se sirven a un máximo de 480 px. Las fotos anteriores se siguen leyendo desde Supabase. La aplicación comprueba la visibilidad del producto antes de entregar la imagen. Guarda `CLOUDINARY_URL` en Vercel o en un archivo `.env` privado.

## Compilar y ejecutar en un alojamiento Node

```powershell
npm run check
npm test
npm run build
npm start
```

Configurar las variables de producción en el servicio de alojamiento. El adaptador Node standalone admite `HOST` y `PORT`. Usar HTTPS, una única instancia inicial y límites de solicitudes en el proxy. El limitador de inicio de sesión de la app vive en memoria y debe sustituirse por uno compartido si se ejecutan varias instancias. El origen y la dirección del cliente deben proceder de un proxy confiable.

Antes de publicar, reemplazar el contenido de muestra, confirmar moneda, revisar la contraseña y verificar WhatsApp en Android, iPhone y escritorio. El sitio prepara el mensaje, el envío depende del cliente. El usuario aún debe elegir dominio y alojamiento.

## Verificaciones

```powershell
npm test
npm run check
npm run test:e2e
npm run build
```

Las pruebas de navegador usan Microsoft Edge instalado en Windows. En otra plataforma puede cambiarse `channel` en `playwright.config.ts` o instalar Chromium con Playwright. Para la prueba del panel, proporcionar la contraseña local mediante `TEST_ADMIN_PASSWORD` en el entorno de la terminal. Si falta, esa prueba se marca omitida. Las pruebas crean un producto temporal que termina como borrador.

Las capturas y trazas se guardan en `test-results/`, fuera de Git. Las pruebas interceptan la salida a WhatsApp para comprobar el enlace sin enviar mensajes.

## Copias de seguridad

En modo local, detener el servidor y copiar `.local/` junto al `.env` privado a una ubicación segura. Para restaurar, devolver esos archivos al proyecto antes de arrancar. Las copias de Supabase deben incluir PostgreSQL y los archivos del bucket `products`, y probarse en un proyecto independiente antes de restaurar producción.

## Fotografías de demostración

El pie del catálogo enlaza a los créditos de las fotografías de portada y demostración. El propietario puede reemplazar las fotos de muestra con imágenes de los artículos que venda.
