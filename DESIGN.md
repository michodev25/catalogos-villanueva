---
name: Catálogos Villanueva
description: Catálogo de energía e iluminación con cotización por WhatsApp
colors:
  primary: "#173e2c"
  background: "#fafbf7"
  surface: "#ffffff"
  muted: "#627166"
  border: "#e0e6da"
  accent: "#d6eab2"
typography:
  body:
    fontFamily: "Manrope Variable, sans-serif"
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "clamp(32px, 3.8vw, 49px)"
    fontWeight: 700
    lineHeight: 1.13
    letterSpacing: "-0.04em"
rounded:
  control: "8px"
  product: "14px"
  dialog: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
---

# Design System — Villanueva

## Overview

La interfaz se apoya en un catálogo de iluminación contemporáneo. Fotografías amplias, precios legibles y controles de selección compactos. La composición de referencia funcional es El Yerro, con un lenguaje visual propio para Villanueva.

## Layout

- Manrope Variable alojada en el proyecto.
- Fondo marfil verdoso #fafbf7, tinta verde #173e2c, texto secundario #627166 y bordes #e0e6da.
- Productos en tres columnas de escritorio y dos columnas de móvil. Controles de cantidad de 44 px.
- Agregar y el selector de cantidad comparten un espacio de 120 × 46 px. En tarjetas estrechas ocupan una fila completa bajo el precio; cambiar la cantidad conserva la posición y el tamaño de la tarjeta. Los productos seleccionados se distinguen con un borde verde suave.
- El carrito usa panel lateral en escritorio y diálogo de pantalla completa en móvil.
- Cotizar es la única acción de contacto del carrito. Usa el icono reconocible de WhatsApp y abre el resumen preparado.
- El panel emplea el mismo sistema con formularios legibles y agrupaciones por información, foto y visibilidad.

## Components

Las tres fotografías de demostración ilustran energía e iluminación. Las fotos de LED y lámpara muestran ambientes genéricos. El propietario reemplaza esas imágenes y los datos de ejemplo antes de publicar. La vista local identifica el contenido de muestra.

## Implementation notes

Se consultaron las guías de contexto, nuevo trabajo, planificación y calidad. El motor pudo generar una propuesta de dirección, con referencia seed:18244405ed62ea43. Se tomó una decisión visual provisional para continuar la ejecución aprobada, catálogo claro con acentos verdes. La revisión visual se realiza sobre capturas reales de móvil y escritorio.
