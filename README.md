# Próximo Tren Urquiza

Un sitio estático para saber a qué hora sale el próximo tren del Ferrocarril
Urquiza entre dos estaciones cualquiera del ramal.

Se elige dónde se sube y dónde se baja, y la página muestra las tres próximas
salidas con la hora de llegada, cuánto dura el viaje y cuánto falta para que
salga. También se puede pedir al revés —"quiero llegar antes de las 9"— y ver
todas las paradas intermedias del tren elegido.

No hay servidor ni base de datos: es HTML, CSS y un bundle de JavaScript que
lee un `horarios.json` y hace las cuentas en el navegador.

## Las dos mitades del proyecto

Son dos programas independientes que solo comparten el formato de un archivo:

| | |
|---|---|
| **`parser/`** | Toma el PDF oficial de Metrovías y escribe `horarios.json`. Python. Ver [parser/README.md](parser/README.md). |
| **la raíz** | El sitio web que consume ese JSON. TypeScript + CSS, compilado a `dist/`. |

La página no sabe quién generó el archivo y el parser no sabe que existe una
página. El contrato está documentado en el README del parser y verificado por
`tests/estructura.test.ts` contra el archivo de verdad.

## Poner a andar

```
npm install
npm run build      # chequea, compila y deja dist/app.js y dist/app.css
npm run servir     # http://localhost:8000 (usa python -m http.server)
```

Hace falta un servidor: la página pide `horarios.json` con `fetch`, y abrir el
`index.html` con doble clic (`file://`) lo bloquea. Cualquier servidor estático
sirve.

### Todos los comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | `check` + compila y minifica el JS y el CSS. |
| `npm run build:debug` | Lo mismo sin minificar, para leer el bundle. |
| `npm run check` | `typecheck` + `test`. Es lo que conviene correr antes de publicar. |
| `npm run typecheck` | `tsc` sobre `src/` y sobre `tests/`. No emite nada. |
| `npm test` | Los tests con el runner de Node. |
| `npm run servir` | Un servidor estático en el puerto 8000. |

Node 24 o más nuevo: los tests importan `.ts` directamente, sin compilar.

## Actualizar los horarios

Cuando Metrovías saca un cuadro nuevo:

1. Dejar el PDF en `parser/`.
2. `cd parser && python parse_horarios.py` — escribe `../horarios.json`.
3. Mirar el resumen que imprime (vigencia y servicios por día y sentido) y
   compararlo con el PDF.
4. `npm test` en la raíz: `tests/estructura.test.ts` valida el archivo nuevo.
5. Subir `horarios.json`. No hay que recompilar nada: el JS no lo tiene
   adentro, lo pide al cargar.

## Cómo está armado el código

`src/` son módulos chicos, cada uno con una responsabilidad. Las dependencias
van en una dirección: los de arriba usan a los de abajo, nunca al revés.

| Módulo | |
|---|---|
| `principal.ts` | El arranque. Pide el JSON, arma el estado, engancha los eventos. Es el único que corre solo al cargarse. |
| `vista.ts` | Vuelca los resultados al documento. |
| `plantillas.ts` | Los pedazos de HTML, armados por string. Puros: devuelven texto y no tocan el DOM. |
| `busqueda.ts` | Encuentra los trenes que sirven un tramo. Puro. |
| `datos.ts` | Acceso al `horarios.json`. Todo índice fuera de rango se chequea acá. |
| `tiempo.ts` | Formato y aritmética de horarios. Sin DOM y sin reloj propio. |
| `almacen.ts` | Recuerda el último viaje en `localStorage`. |
| `elementos.ts` | Busca los nodos del HTML una sola vez, con su tipo concreto. |
| `tipos.ts` | El esquema del JSON y los tipos que se pasan entre módulos. Solo tipos: no deja nada en el bundle. |

Dos decisiones que explican varias cosas del código:

- **La hora entra por parámetro, no se lee del reloj.** `buscar()` y compañía
  reciben un `Date`. Por eso se pueden probar sin trucos con el tiempo.
- **La línea de tiempo abarca del día anterior a dos días después.** Así los
  trenes que cruzan la medianoche (minutos por encima de 1440) y los primeros
  del día siguiente entran en la misma comparación que los de hoy.

`estilos/` se compila igual que el código: `index.css` es el punto de entrada y
esbuild pega los `@import` en `dist/app.css`. El orden de esos imports es la
cascada.

## Los tests

Están en `tests/` y corren con `node --test`. Además de los de lógica
(`tiempo`, `busqueda`, `plantillas`), hay tres que verifican contratos que
nada más chequea y que al romperse no dan error en ningún lado —se ven recién
al abrir la página:

- **`estructura.test.ts`** — el `horarios.json` real contra lo que espera
  `tipos.ts`.
- **`pagina.test.ts`** — que `index.html` tenga todos los `id` que el código
  busca y las rutas correctas a los bundles.
- **`estilos.test.ts`** — que las clases que escriben las plantillas existan en
  el CSS.
- **`contraste.test.ts`** — que la paleta cumpla WCAG AA. Los colores de
  Metrovías son claros (`#f5b02c` sobre blanco da 1.9:1), así que hay variantes
  oscurecidas para lo que lleva texto; es fácil deshacerlas sin querer al
  retocar un color.

## Un detalle sobre los datos

Los feriados usan el horario de domingos, y algunos servicios no circulan esos
días: la página los marca con la leyenda que trae el propio PDF.

El cuadro vigente desde marzo de 2026 tiene además una errata de tipeo que el
parser reporta pero no corrige. Está explicada en
[parser/README.md](parser/README.md#un-dato-conocido-con-errata).

Como siempre, conviene consultar el estado del servicio antes de viajar.
