/**
 * El contrato entre index.html y el codigo.
 *
 * index.html paso a ser un archivo estatico, escrito a mano: ya no lo genera
 * ningun script que verifique que estan todos los huecos. Si alguien le saca
 * un id o le cambia la ruta de un bundle, la pagina revienta al arrancar y no
 * hay nada mas que lo avise. Esto lo avisa.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname, "..");
const html = readFileSync(join(RAIZ, "index.html"), "utf8");
const elementos = readFileSync(join(RAIZ, "src", "elementos.ts"), "utf8");

test("index.html tiene todos los ids que busca elementos.ts", () => {
  // Se leen del propio elementos.ts para que las dos listas no se separen.
  const ids = [...elementos.matchAll(/pedir\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 10, "no se pudieron leer los ids de elementos.ts");

  for (const id of ids) {
    assert.ok(html.includes('id="' + id + '"'),
              'falta id="' + id + '" en index.html, y elementos.ts lo pide');
  }
});

test("index.html enlaza los dos bundles y el JSON", () => {
  assert.ok(html.includes('href="dist/app.css"'), "falta el <link> del CSS");
  assert.ok(html.includes('src="dist/app.js"'), "falta el <script> del codigo");
  // Rutas relativas: la pagina tiene que andar servida desde una subcarpeta,
  // que es como la publica GitHub Pages en un repo de proyecto.
  assert.equal(html.includes('src="/dist/'), false, "ruta absoluta en el JS");
  assert.equal(html.includes('href="/dist/'), false, "ruta absoluta en el CSS");
});

test("no quedaron marcadores de la epoca en que index.html se generaba", () => {
  for (const viejo of ["__DATOS__", "__APP__", "__ESTILOS__",
                       "__ESTACIONES_ORIGEN__", "__ESTACIONES_DESTINO__",
                       "__DIAS__"]) {
    assert.equal(html.includes(viejo), false,
                 "quedo el marcador " + viejo + " en index.html");
  }
  assert.equal(html.includes("window.HORARIOS"), false,
               "los horarios ya no viajan adentro de la pagina");
});

test("el manejador de errores corre antes que el bundle", () => {
  const manejador = html.indexOf("unhandledrejection");
  const bundle = html.indexOf('src="dist/app.js"');
  assert.ok(manejador > 0, "falta el manejador de promesas rechazadas");
  assert.ok(bundle > 0, "falta el bundle");
  // Si el bundle se adelantara, los fallos de carga —el caso mas probable—
  // quedarian sin cartel.
  assert.ok(manejador < bundle,
            "el manejador de errores quedo despues del bundle");
});
