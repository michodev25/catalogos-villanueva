---
name: Catálogos Villanueva
description: Catálogo de energía e iluminación con cotización por WhatsApp
colors:
  primary: "#131a13"
  navigation: "#263323"
  background: "#f2f4ee"
  surface: "#ffffff"
  muted: "#535e4e"
  border: "#dce2d5"
  accent: "#b9db78"
typography:
  body:
    fontFamily: "Manrope Variable, sans-serif"
  display:
    fontFamily: "Archivo Black, Manrope Variable, sans-serif"
    fontSize: "clamp(32px, 4.1vw, 58px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.04em"
rounded:
  control: "8px"
  product: "14px"
  dialog: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
---

# Design System — Villanueva

## Overview

La navegación toma como referencia las tiendas en línea con buscador central y una segunda fila para categorías. El emblema del carrito con palmera define el verde lima y la tinta oscura de Villanueva.

## Layout

- UnifrakturMaguntia para el nombre Villanueva junto al emblema. Archivo Black para titulares y Manrope Variable para búsqueda, controles y texto. Las tres familias se sirven desde el proyecto.
- Cabecera oscura con búsqueda de ancho flexible, carrito y categorías con iconos Lucide. Las categorías pasan a filas adicionales según el espacio disponible. En móvil, la búsqueda usa todo el ancho disponible.
- Portada con titular y foto ambiental. Al buscar o filtrar, los resultados ocupan su lugar.
- Productos en tres columnas de escritorio y dos columnas de móvil. Controles de cantidad de 44 px.
- Agregar y el selector de cantidad comparten un espacio de 120 × 46 px. En tarjetas estrechas ocupan una fila completa bajo el precio; cambiar la cantidad conserva la posición y el tamaño de la tarjeta. Los productos seleccionados se distinguen con un borde verde suave.
- El carrito usa panel lateral en escritorio y diálogo de pantalla completa en móvil.
- Cotizar es la única acción de contacto del carrito. Usa el icono reconocible de WhatsApp y abre el resumen preparado.
- El panel emplea el mismo sistema con formularios legibles y agrupaciones por información, foto y visibilidad.

## Components

Las fotografías de demostración ilustran los tipos de producto. El propietario reemplaza esas imágenes y los datos de ejemplo antes de publicar. El panel local y las fichas de muestra identifican ese contenido.

## Imágenes

El emblema de `public/villanueva-logo.png` proviene del archivo entregado por el propietario. La portada muestra una instalación solar fotografiada por Wikideas1. Los créditos y licencias se consultan desde el pie del catálogo.
