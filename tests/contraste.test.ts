/**
 * El contraste de la paleta.
 *
 * Los colores de Metrovias son claros: #00bab3 sobre blanco da 2.4:1 y
 * #f5b02c da 1.9:1, muy por debajo del 4.5:1 que pide WCAG AA para texto
 * chico. Por eso base.css tiene variantes oscurecidas para lo que lleva
 * texto. Es facil deshacer eso sin querer al retocar un color, y en pantalla
 * no salta hasta que alguien no puede leer la hora del tren.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(
  join(import.meta.dirname, "..", "estilos", "base.css"), "utf8");

function tokens(bloque: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const g of bloque.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) {
    const nombre = g[1];
    const valor = g[2];
    if (nombre && valor) { mapa[nombre] = valor.toLowerCase(); }
  }
  return mapa;
}

const claro = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media")));
const bloqueOscuro = css.slice(css.indexOf(':root[data-theme="dark"]'));
const oscuro = {
  ...claro,
  ...tokens(bloqueOscuro.slice(0, bloqueOscuro.indexOf("}"))),
};

/** Luminancia relativa segun WCAG 2.1. */
function luminancia(hex: string): number {
  const canal = (desde: number): number => {
    const v = parseInt(hex.slice(desde, desde + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro2 = Math.max(la, lb);
  const oscuro2 = Math.min(la, lb);
  return (claro2 + 0.05) / (oscuro2 + 0.05);
}

/** [frente, fondo, minimo, donde se ve]. 4.5 = texto; 3 = borde o foco. */
const PARES: readonly [string, string, number, string][] = [
  ["--tinta", "--fondo", 4.5, "texto principal sobre la pagina"],
  ["--tinta", "--panel", 4.5, "texto principal sobre las tarjetas"],
  ["--tinta-2", "--panel", 4.5, "llegada y paradas"],
  ["--tinta-2", "--fondo", 4.5, "texto secundario sobre la pagina"],
  ["--tinta-3", "--panel", 4.5, "duracion del viaje, resumen de paradas"],
  ["--tinta-3", "--fondo", 4.5, "vigencia y pie"],
  ["--ambar-oscuro", "--panel", 4.5, "cuenta regresiva del proximo tren"],
  ["--ambar-oscuro", "--fondo", 3, "borde del foco"],
  ["--ambar-oscuro", "--ambar-cl", 4.5, "el cartel de error"],
  // La tarjeta elegida se pinta con gris, y la primera suele ser ademas la
  // proxima: todo lo que lleva encima tiene que seguir leyendose.
  ["--tinta", "--linea-suave", 4.5, "hora en la tarjeta elegida"],
  ["--tinta-2", "--linea-suave", 4.5, "llegada, y el marbete de dia"],
  ["--tinta-3", "--linea-suave", 4.5, "duracion en la tarjeta elegida"],
  ["--ambar-oscuro", "--linea-suave", 4.5, "cuenta regresiva en la elegida"],
  // Lo unico relleno con el amarillo oficial: la chapa URQUIZA, el modo
  // activo y el marbete de nota.
  ["--ambar-tinta", "--ambar", 4.5, "la chapa URQUIZA, el modo activo, la nota"],
];

/* Lo que a proposito NO se exige aca: el borde del relleno amarillo contra el
   fondo (--ambar sobre --panel da 1.89:1). WCAG pide 3:1 para un elemento
   grafico solo cuando es lo unico que transmite la informacion, y no es el
   caso: al proximo tren tambien lo distinguen el cuerpo mas grande, la sombra
   y el padding, y al modo activo lo distinguen el color de la tinta y el
   aria-pressed que anuncia el lector de pantalla. Si en algun momento la
   franja o el relleno quedan como unica senal, esto hay que revisarlo. */

for (const [nombre, paleta] of [["claro", claro], ["oscuro", oscuro]] as const) {
  test("tema " + nombre + ": todo lo que se lee tiene contraste", () => {
    for (const [frente, fondo, minimo, donde] of PARES) {
      const a = paleta[frente];
      const b = paleta[fondo];
      assert.ok(a, "falta el token " + frente + " en el tema " + nombre);
      assert.ok(b, "falta el token " + fondo + " en el tema " + nombre);

      const r = contraste(a, b);
      assert.ok(r >= minimo,
        frente + " sobre " + fondo + " (" + donde + ") da " + r.toFixed(2) +
        ":1 y necesita " + minimo + ":1");
    }
  });
}

test("los colores oficiales estan tal cual", () => {
  assert.equal(claro["--ambar"], "#f5b02c", "el amarillo del Urquiza cambio");
  assert.equal(claro["--tinta-2"], "#515151", "el gris de Metrovias cambio");
  assert.equal(claro["--panel"], "#ffffff", "el blanco cambio");
});

test("la paleta no tiene mas color que el amarillo", () => {
  // Todo lo que no sea de la familia del amarillo tiene que ser neutro
  // (R, G y B parecidos). Es lo que evita que vuelva a colarse un acento.
  const familiaAmbar = ["--ambar", "--ambar-tinta", "--ambar-oscuro", "--ambar-cl"];
  for (const [nombre, paleta] of [["claro", claro], ["oscuro", oscuro]] as const) {
    for (const token of Object.keys(paleta)) {
      if (familiaAmbar.includes(token)) { continue; }
      const hex = paleta[token];
      if (!hex) { continue; }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const desvio = Math.max(r, g, b) - Math.min(r, g, b);
      assert.ok(desvio <= 6,
        "en el tema " + nombre + ", " + token + " (" + hex + ") tiene color: " +
        "los neutros tienen que ser grises");
    }
  }
});
