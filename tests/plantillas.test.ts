import { test } from "node:test";
import assert from "node:assert/strict";

import { marbete, tarjetaSalida, textoCuenta } from "../src/plantillas.ts";
import type { Referencia, Servicio } from "../src/tipos.ts";

function servicio(cambios: Partial<Servicio> = {}): Servicio {
  return {
    sale: 600, llega: 640, etiqueta: "", nota: false,
    tren: [600, 610, 620, 630, 640], desp: 0,
    ...cambios,
  };
}

const enVivo: Referencia = { minutos: 540, enVivo: true };

test("textoCuenta cubre sus cuatro ramas", () => {
  // Con una hora escrita la cuenta regresiva no significa nada.
  assert.equal(textoCuenta(30, false), "");
  assert.equal(textoCuenta(0, true), "sale ya");
  assert.equal(textoCuenta(-5, true), "sale ya");
  assert.equal(textoCuenta(59, true), "en 59 min");
  assert.equal(textoCuenta(75, true), "en 1 h 15 min");
});

test("tarjetaSalida respeta el contrato con el click y con el CSS", () => {
  const lista = [servicio({ sale: 600 }), servicio({ sale: 700 }),
                 servicio({ sale: 800 })];
  const sel = 1;
  const html = lista.map((s, i) => tarjetaSalida(s, i, sel, enVivo, "nota"));

  // salida--proxima solo en el primero.
  assert.ok(html[0]?.includes("salida--proxima"));
  assert.equal(html[1]?.includes("salida--proxima"), false);
  assert.equal(html[2]?.includes("salida--proxima"), false);

  // aria-pressed="true" y salida--elegida solo en el seleccionado.
  assert.equal(html[0]?.includes('aria-pressed="true"'), false);
  assert.ok(html[1]?.includes('aria-pressed="true"'));
  assert.ok(html[1]?.includes("salida--elegida"));
  assert.equal(html[2]?.includes('aria-pressed="true"'), false);

  // data-i tiene que coincidir con el indice: es lo que lee el listener.
  assert.ok(html[0]?.includes('data-i="0"'));
  assert.ok(html[1]?.includes('data-i="1"'));
  assert.ok(html[2]?.includes('data-i="2"'));
});

test("tarjetaSalida muestra horas, duracion y marbetes", () => {
  const html = tarjetaSalida(
    servicio({ sale: 600, llega: 700, etiqueta: "mañana", nota: true }),
    0, 0, enVivo, "No circula los feriados");

  assert.ok(html.includes("10:00"), "falta la hora de salida");
  assert.ok(html.includes("11:40"), "falta la hora de llegada");
  assert.ok(html.includes("1 h 40 min de viaje"));
  assert.ok(html.includes(marbete("dia", "mañana")));
  assert.ok(html.includes(marbete("nota", "No circula los feriados")));
});

test("sin etiqueta ni nota no se dibujan marbetes", () => {
  const html = tarjetaSalida(servicio(), 0, 0, enVivo, "nota");
  assert.equal(html.includes("marbete"), false);
});
