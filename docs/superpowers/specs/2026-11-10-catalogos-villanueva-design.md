# Diseño de Catálogos Villanueva

## Objetivo

Publicar un catálogo web para una tienda que vende paneles, tiras LED RGB y lámparas solares. Los clientes pueden ver precios, armar un carrito y continuar en el chat privado de la tienda al +53 59159122. La persona que administra Villanueva puede crear productos, subir fotos y editar la información desde el móvil o la computadora.

La primera versión cubre la navegación del catálogo, la administración de productos y el traspaso a WhatsApp. Disponibilidad final, entrega y pago se acuerdan en el chat.

## Enfoques considerados

| Enfoque | Ventaja | Coste operativo |
| --- | --- | --- |
| Catálogo propio con panel de productos y cierre por WhatsApp | Control del diseño y de la información que acompaña cada solicitud | El seguimiento de los pedidos se hace en el chat |
| Catálogo propio con historial web de solicitudes y cierre por WhatsApp | Permite asignar códigos y estados a las solicitudes | Requiere reconciliar los registros de la web con lo que los clientes realmente envían |

Se propone el primer enfoque para una sola tienda. Un historial interno quedaría para cuando el volumen de pedidos lo justifique. La apertura del chat y el envío del mensaje son eventos distintos.

## Catálogo público

- La portada muestra el nombre de Villanueva, un buscador, las tres categorías y las tarjetas de productos. Cada tarjeta presenta la foto principal, el nombre, el precio con moneda y una descripción breve cuando exista.
- Todos los productos publicados tienen precio visible, incluidos los agotados. La primera versión usa una moneda configurable para todo el catálogo.
- La ficha amplía la descripción y las especificaciones. Las especificaciones son pares de etiqueta y valor, como longitud y voltaje para una tira o potencia y autonomía para una lámpara.
- Se propone publicar cada presentación como un producto independiente. Una tira de 5 m y una de 10 m pueden tener su propia foto, precio y disponibilidad.
- Los productos disponibles empiezan con **Agregar**. Tras pulsarlo, la tarjeta muestra **[ + ] 1 [ − ]**. La cantidad cambia en la tarjeta y en el carrito. Al llegar a cero se elimina la línea y reaparece **Agregar**.
- En móvil, el carrito se abre desde una barra inferior con el número de artículos y el subtotal. En escritorio, se abre como panel lateral. Los controles del carrito admiten teclado y tienen etiquetas que indican su acción y producto.

## Carrito y WhatsApp

- Guardar en el navegador los identificadores y las cantidades para recuperar el carrito al recargar. Obtener los precios de los datos actuales del catálogo.
- Antes de preparar el mensaje, comprobar en el servidor los precios y la disponibilidad. Si cambió un precio o un artículo se agotó o dejó de publicarse, explicar el cambio y dejar el carrito listo para que el cliente lo revise.
- **Cotizar** abre el chat con el resumen de productos, cantidades y subtotal en la moneda de la tienda. Si la entrega se cotiza aparte, el resumen lo indica. La acción requiere un carrito con al menos un artículo disponible.
- Usar `https://wa.me/5359159122` con texto precargado. La interfaz conserva el carrito al abrir WhatsApp. El cliente pulsa **Enviar** allí y Villanueva confirma los detalles en la conversación.

## Administración

- Acceso privado con una sola cuenta, reservada al propietario de Villanueva. La pantalla de acceso pide usuario y contraseña. El usuario visible es `admin`. Los visitantes pueden consultar el catálogo público sin registrarse.
- Crear la cuenta de forma privada. Deshabilitar el registro público y la creación de cuentas desde el panel. Validar la sesión y la identidad del administrador en el servidor para cada operación de edición o subida.
- El administrador puede crear productos y editar nombre, descripción, especificaciones, precio, categoría y estado.
- El formulario permite subir una foto principal, previsualizarla y reemplazarla. Validar el tipo y el tamaño del archivo y servir una versión optimizada para el catálogo. Si falla un reemplazo, conservar la foto anterior.
- Separar la publicación de la disponibilidad. Un borrador permanece oculto. Un producto publicado puede estar disponible o agotado. El agotado conserva su ficha y precio y aparece sin control de cantidad.
- Para publicar, exigir nombre, categoría, foto y un precio positivo. Un borrador admite información incompleta.

## Arquitectura propuesta

- Astro sirve el catálogo, las fichas y el panel. React aporta la interacción del buscador y del carrito con un estado compartido. Usar renderizado bajo demanda donde se necesiten datos recientes o una sesión de administrador.
- Supabase es el candidato inicial. PostgreSQL guarda categorías, productos, configuración de la tienda y referencias de imágenes. Storage conserva las fotos y Auth gestiona el acceso administrativo. Con Supabase Auth, el servidor traduce el alias `admin` al correo privado de la cuenta, que se configura fuera del código.
- Configurar las credenciales de prueba y producción por separado. Mantener las contraseñas fuera del código, los archivos versionados y los registros de la app. Para publicar el panel, usar una contraseña única y larga, y limitar los intentos de inicio de sesión.
- Guardar importes con precisión fija. Mantener los permisos de lectura pública limitados a productos publicados. Restringir escrituras y subidas al administrador con autorización en el servidor y políticas de acceso de datos y archivos.
- Se deja para la implementación la elección del alojamiento y del adaptador de Astro, las dimensiones de las fotos, el límite de subida y los puntos de cambio del diseño responsive. Si el negocio opera desde Cuba, verificar el catálogo, el acceso al panel y las subidas desde la conexión real antes de elegir proveedores definitivos.

## Validación antes de publicar

1. Desde el panel, crear un producto de prueba, cambiar su nombre, descripción, foto y precio, publicarlo y comprobar los cambios en el catálogo. Marcarlo agotado y después volverlo a borrador.
2. Desde móvil y escritorio, buscar por nombre, navegar por categoría, agregar productos, cambiar cantidades en ambos lugares y confirmar que el carrito sobrevive a una recarga.
3. Cambiar un precio o agotar un producto con un carrito abierto y comprobar que se muestra el cambio antes de preparar la solicitud.
5. Comprobar que la cuenta `admin` puede entrar, que el registro público está deshabilitado y que una sesión pública solo puede consultar productos publicados. Verificar que la edición y la subida de archivos requieren una sesión de esa cuenta.
