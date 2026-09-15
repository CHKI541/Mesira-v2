# Plan de diseño — Mesira

Este documento es la fuente de verdad visual del proyecto. Se escribió **antes** del código,
siguiendo la skill oficial `frontend-design` de Anthropic
(https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).
Si algo del código contradice este documento, el documento gana.

---

## 1. El encargo

**Qué es.** Un tablero donde gente de la comunidad judía argentina regala cosas que ya no usa.
No es una tienda: no hay precios, ni carrito, ni checkout, ni vendedor. Hay alguien que hace una
mitzvá y alguien que necesita una cuna.

**Para quién.** Familias, de 25 a 65 años, mayoritariamente desde el celular, muchas veces
apuradas, muchas no muy técnicas.

**Trabajo principal de la página.** Dos cosas, en este orden:

1. Encontrar rápido lo que necesito, cerca mío.
2. Publicar lo que regalo en menos de un minuto.

Todo lo demás es secundario y no debe competir con esos dos objetivos.

---

## 2. Color

La dirección elegida fue **limpio y utilitario**. La decisión de fondo: el color no decora,
el color *informa*. Toda la interfaz es tinta sobre papel, y el único color saturado de la página
significa algo concreto — si algo está verde, está disponible.

### Modo claro

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--paper` | `#F2F3EF` | Fondo general. Blanco roto con una leve caída verde-gris: papel de cartelera, no crema. |
| `--surface` | `#FFFFFF` | Tarjetas, modales, campos. |
| `--ink` | `#14262E` | Texto principal. Azul pizarra muy oscuro: es tinta, no un negro apagado. |
| `--ink-2` | `#5C6E77` | Texto secundario, metadatos. |
| `--ink-3` | `#8A999F` | Deshabilitado, marcas de agua. |
| `--rule` | `#D8DCD6` | Filetes de 1px. Estructura, no adorno. |
| `--green` | `#17614B` | **Disponible.** Verde pino profundo. El único color de acción. |
| `--green-soft` | `#E3EFE9` | Fondo de estados disponibles. |
| `--amber` | `#A8660F` | Quedan pocos contactos / va a cerrarse. |
| `--clay` | `#8C3A22` | Errores y acciones destructivas. |

### Modo oscuro

Mismos roles, invertidos: `--paper` `#0F1513`, `--surface` `#171E1C`, `--ink` `#E7EBE5`,
`--rule` `#2A3330`, `--green` `#4E9E80`.

### Lo que este sistema prohíbe

- Degradados como decoración.
- Azul de link genérico. Los enlaces son tinta con subrayado.
- Colores de marca repartidos por gusto. Si un elemento tiene color, tiene un significado.

---

## 3. Tipografía

Dos familias, con una división que también es información:

- **Archivo** (variable, 400–800) — la voz del sistema. Navegación, títulos, botones, etiquetas,
  números, tablas.
- **Source Serif 4** (variable, 400–600) — la voz de una persona. Descripciones de los artículos,
  páginas de ayuda, textos de los correos.

Cuando leés una descripción en serif, estás leyendo lo que escribió un vecino. Cuando leés sans,
te está hablando la aplicación. Es una distinción real, no un contraste estético.

### Escala

| Rol | Móvil | Escritorio | Peso | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| Display | 30/34 | 40/44 | 800 | −0.022em |
| Título 2 | 20/26 | 22/28 | 700 | −0.012em |
| Título 3 | 16/22 | 16/22 | 600 | −0.006em |
| Cuerpo sans | 15/24 | 15/24 | 400 | 0 |
| Cuerpo serif | 16/26 | 17/28 | 400 | 0 |
| Chico | 13/18 | 13/18 | 500 | 0 |
| Micro | 12/16 | 12/16 | 500 | 0.004em |

Medida máxima de línea: 68 caracteres en sans, 74 en serif.

### Prohibiciones tipográficas

Estos son los tics más delatores de una página generada, y la versión vieja de Mesira los tenía
casi todos. Ninguno entra:

- Etiquetas en MAYÚSCULAS con `letter-spacing` abierto.
- Resaltar una sola palabra del titular en otro color o en itálica.
- Rótulos decorativos encima de cada bloque de contenido.
- Metadatos unidos con puntos medios (`A · B · C`).
- Flechas `→` pegadas al texto de los botones.
- Monoespaciada para etiquetas de datos.

---

## 4. Layout

### Concepto

Un **tablero cronológico**, no una vitrina. La página no tiene hero de marketing: lo primero que
ve cualquiera, ya sea que entre por primera vez o por décima, son los artículos de hoy. Explicar
qué es Mesira encima de los artículos sería poner el folleto delante de la mercadería.

Quien entra por primera vez recibe una franja fina y descartable arriba, y una explicación de tres
pasos *debajo* de la primera fila de artículos, donde ya vio de qué se trata.

```
┌───────────────────────────────────────────────┐
│ Mesira    [ buscar…                ]  [＋] [◉]│  barra 56px, fija, filete abajo
├───────────────────────────────────────────────┤
│  Todo · Muebles · Ropa · Bebés · Libros  →    │  chips con scroll, solo móvil
├───────────────────────────────────────────────┤
│ ── Hoy ──────────────────────── 12 artículos  │  filete de día
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ foto │ │ foto │ │ foto │ │ foto │  4:5     │
│  ├──────┤ ├──────┤ ├──────┤ ├──────┤          │
│  │título│ │título│ │título│ │título│          │
│  │ Once │ │Flores│ │Belgr.│ │ Once │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│ ── Ayer ───────────────────────  8 artículos  │
└───────────────────────────────────────────────┘
```

En escritorio los filtros van en un riel izquierdo de 220px construido con filetes y espacio,
no con una tarjeta enmarcada.

### Grilla

2 columnas en móvil, 3 en tablet, 4 en escritorio, 5 arriba de 1440px. Todo alineado a la
izquierda; nada centrado salvo los estados vacíos.

### Radios

Una escala chica y usada con intención: 2px en chips, 4px en tarjetas, campos e imágenes,
999px **únicamente** en el punto de estado. Nada más es redondeado.

---

## 5. Principios

1. **El tablero empieza arriba.** Sin hero. El contenido es la portada.
2. **El color es estado.** Verde significa disponible. Si algo tiene color, significa algo.
3. **Los filetes de día son información.** Un tablero de donaciones es cronológico por naturaleza;
   la estructura visual lo dice en lugar de disimularlo.
4. **Dos voces.** Sans es el sistema; serif es una persona.
5. **Cromo callado.** Sin sombras en las tarjetas, sin degradados, sin mayúsculas decorativas.
6. **La audacia va en un solo lugar: la foto.** Las tarjetas son una foto 4:5 y, debajo, todo lo
   demás en voz baja. En la ficha, la foto va de borde a borde en móvil.

---

## 6. Movimiento

Nada se anima al cargar la página. Las transiciones responden únicamente a una acción de la
persona: revelar un contacto, aplicar un filtro, abrir un diálogo. Duración 120–180ms.
`prefers-reduced-motion: reduce` desactiva todo globalmente.

Esto descarta a propósito el patrón más común de página generada: cada sección entrando con
fade-and-slide y cada tarjeta levantándose al pasar el mouse.

---

## 7. Redacción

- Voz activa y en segundo persona rioplatense: "Publicá", "Guardá", "Contactá".
- El botón dice exactamente qué pasa. "Publicar la mitzvá" produce "Publicada".
- Un error dice qué pasó y cómo se arregla. No pide disculpas ni es vago.
- Una pantalla vacía es una invitación a hacer algo, no un cartel triste.
- Vocabulario del usuario, no del sistema: "contactos recibidos", no "contactCount".

---

## 8. Piso de calidad

Sin anunciarlo, todo cumple:

- Responsive real desde 360px.
- Foco de teclado visible en todo lo interactivo.
- Contraste AA como mínimo en todo texto.
- `prefers-reduced-motion` y `prefers-color-scheme` respetados.
- Objetivos táctiles de 44px mínimo.
- Imágenes con `alt` real y `aspect-ratio` reservado para que nada salte al cargar.
