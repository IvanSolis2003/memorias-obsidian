# Design system — Memorias Ivan

Imita la app móvil de Obsidian. Los valores son aproximados al tema oscuro por defecto y se afinan con las capturas de `referencias/`.

## Tokens (variables CSS en `:root`)

Tema oscuro por defecto y tema claro opcional. Se definen en `src/styles/tokens.css`.

| Token | Valor |
|---|---|
| `--background-primary` | `#1e1e1e` |
| `--background-secondary` | `#262626` |
| `--background-secondary-alt` | `#363636` |
| `--background-modifier-border` | `#363636` |
| `--background-modifier-hover` | `rgba(255,255,255,0.07)` |
| `--text-normal` | `#dadada` |
| `--text-muted` | `#b3b3b3` |
| `--text-faint` | `#666666` |
| `--interactive-accent` | `#7f6df2` |
| `--text-accent` | `#a78bfa` |
| `--text-accent-hover` | `#c4b5fd` |
| `--code-background` | `#262626` |
| `--graph-node` | `#9a9a9a` |
| `--graph-line` | `#5c5c5c` (claro: `#b0b0b0`) |
| `--graph-node-focused` | `#7f6df2` |

Tokens adicionales: `--background-modifier-scrim` (velo de los drawers), `--text-on-accent`, `--font-text`, `--font-monospace`, `--safe-top/right/bottom/left` (safe areas de iOS), `--header-height` (48px), `--toolbar-height` (52px), `--drawer-width` (`min(86vw, 360px)`) y `--radius-m` (8px).

El tema claro se activa con `data-theme="light"` en `<html>` y se recuerda en `localStorage`.

## Tipografía

- Texto: `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`, 16px, `line-height: 1.5`.
- Código: `ui-monospace, SFMono-Regular, Menlo, monospace`.
- Títulos, peso 600: h1 2em, h2 1.6em, h3 1.37em, h4 1.25em, h5 y h6 1.12em.

## Layout móvil

- Barra superior: botón del panel izquierdo, título de la nota al centro (truncado), botón del panel derecho.
- Contenido central en modo lectura por defecto, con botón para alternar a modo edición. Ancho completo con márgenes de 16px.
- Panel izquierdo (drawer): Explorador de archivos, Búsqueda y Marcadores/Tags.
- Panel derecho (drawer): Backlinks, Enlaces salientes, Esquema y Propiedades.
- Barra inferior: atrás, adelante, nueva nota (+), contador de pestañas (abre el selector de pestañas) y menú "⋯" (actualizar, grafo, selector rápido, tema, conexiones y cerrar sesión).
- Propiedades del frontmatter arriba de la nota, en bloque colapsable.
- Callouts con icono y color por tipo. Enlaces internos en color acento; enlaces a notas inexistentes más tenues.
- Pantalla Conexiones con el estilo de los Ajustes de Obsidian: filas con título y descripción a la izquierda y control a la derecha, secciones con encabezado en mayúsculas pequeñas.
- Respetar safe areas de iOS (`env(safe-area-inset-*)`) y evitar el rebote del scroll en los drawers.

## Componentes

- **Búsqueda** (pestaña del panel izquierdo): campo de 44px, contador de resultados y filas con icono, título, carpeta y fragmento de hasta 3 líneas. Los términos encontrados van en `<mark>` con fondo `--interactive-accent` al 35%.
- **Selector rápido**: diálogo anclado arriba con campo y lista de notas; la fila marcada usa `--background-modifier-hover`.
- **Pestañas abiertas**: hoja inferior con una tarjeta por pestaña (título y carpeta); la activa lleva borde `--interactive-accent`. El contador de la barra inferior es un cuadro de borde 2px con el número.
- **Grafo**: lienzo 2D con nodos de tamaño casi constante, etiquetas con halo del color de fondo y color por carpeta raíz (matiz = 250° + índice × 137,5°, saturación 62%, luminosidad 64% en oscuro y 42% en claro). La leyenda inferior son chips de 30px que filtran por carpeta.
- **Diálogos**: fondo `--background-modifier-scrim`, tarjeta `--background-secondary` con borde `--background-modifier-border`, radio 14px y botones de 44px de alto.

## PWA

Fondo y color de tema `#1e1e1e`. Iconos de 192, 512, maskable y apple-touch con un grafo de tres nodos en degradado `#a99bff` → `#7f6df2` sobre `#1e1e1e`, en `public/`. En iPhone se abre a pantalla completa con la barra de estado translúcida, por eso toda la interfaz respeta las safe areas.

## Estilos e iconos

CSS Modules + variables CSS propias, sin MUI ni Tailwind. Iconos SVG propios inline, estilo línea (como Lucide), sin instalar librerías.
