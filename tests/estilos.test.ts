/**
 * El contrato entre las plantillas y la hoja de estilos.
 *
 * `plantillas.ts` escribe los nombres de clase a mano, dentro de strings, y el
 * CSS que los define ahora vive en otra carpeta. Nada le avisa a nadie si uno
 * de los dos lados cambia: se ve recien al abrir la pagina. Esto lo chequea.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { marbete, tarjetaSalida, vacio } from "../src/plantillas.ts";
import type { Referencia, Servicio } from "../src/tipos.ts";

const ESTILOS = join(import.meta.dirname, "..", "estilos");

const css = readdirSync(ESTILOS)
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(join(ESTILOS, f), "utf8"))
  .join("\n");

const servicio: Servicio = {
  sale: 600, llega: 640, etiqueta: "mañana", nota: true,
  tren: [600, 610, 620, 630, 640], desp: 0,
};
const ref: Referencia = { minutos: 540, enVivo: true };

/** Todas las clases que aparecen en los class="..." de un HTML. */
function clasesDe(html: string): string[] {
  const encontradas = new Set<string>();
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    for (const clase of (m[1] ?? "").split(" ")) {
      if (clase) { encontradas.add(clase); }
    }
  }
  return [...encontradas].sort();
}

test("cada clase que escriben las plantillas tiene reglas en estilos/", () => {
  const html = [
    tarjetaSalida(servicio, 0, 0, ref, "nota"),
    tarjetaSalida(servicio, 1, 0, ref, "nota"),
    marbete("dia", "mañana"),
    marbete("nota", "No circula los feriados"),
    vacio("Elegí dos estaciones distintas."),
  ].join("");

  const clases = clasesDe(html);
  // Si esto baja, es que alguna plantilla dejo de emitir una clase.
  assert.ok(clases.length >= 12, "se esperaban mas clases: " + clases.join(" "));

  for (const clase of clases) {
    assert.ok(css.includes("." + clase),
              "la clase '" + clase + "' la escribe plantillas.ts pero no " +
              "tiene reglas en estilos/");
  }
});

test("las clases que engancha el JS siguen definidas", () => {
  // principal.ts hace closest(".salida") y vista.ts togglea .salida--elegida.
  for (const clase of ["salida", "salida--elegida", "salida--proxima"]) {
    assert.ok(css.includes("." + clase), "falta ." + clase + " en estilos/");
  }
});

test("los estilos se cargan enteros desde estilos/index.css", () => {
  const index = readFileSync(join(ESTILOS, "index.css"), "utf8");
  const importados = [...index.matchAll(/@import\s+"\.\/([^"]+)"/g)]
    .map((m) => m[1]);
  const archivos = readdirSync(ESTILOS).filter(
    (f) => f.endsWith(".css") && f !== "index.css");

  // Un .css nuevo que nadie importa no llega al bundle y no se nota.
  assert.deepEqual([...importados].sort(), [...archivos].sort());
});
